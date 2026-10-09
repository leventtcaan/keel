package app.keel.decision;

import app.keel.consent.ConsentGate;
import app.keel.consent.ConsentKind;
import app.keel.engine.Action;
import app.keel.engine.ActivityLevel;
import app.keel.engine.CheckIn;
import app.keel.engine.Consistency;
import app.keel.engine.Decision;
import app.keel.engine.DecisionPipeline;
import app.keel.engine.DeclaredContext;
import app.keel.engine.EnergyBudget;
import app.keel.engine.Experience;
import app.keel.engine.FatEstimate;
import app.keel.engine.FirstWeekAdjustment;
import app.keel.engine.FirstWeeks;
import app.keel.engine.InitialTarget;
import app.keel.engine.MiniCutGate;
import app.keel.engine.ParameterKey;
import app.keel.engine.ParameterSet;
import app.keel.engine.Parameters;
import app.keel.engine.Phase;
import app.keel.engine.PhaseGate;
import app.keel.engine.Profile;
import app.keel.engine.SafetyNet;
import app.keel.engine.ShapeProjection;
import app.keel.engine.Sex;
import app.keel.engine.Snapshot;
import app.keel.engine.TrainingStatus;
import app.keel.engine.WaistTrend;
import app.keel.engine.WhatIf;
import app.keel.engine.WeekTally;
import app.keel.engine.WeighIn;
import app.keel.engine.WeightSeries;
import app.keel.engine.WeightTrend;
import app.keel.identity.AccountDates;
import app.keel.measurement.Measurements;
import app.keel.profile.ProfileFacts;
import app.keel.profile.Profiles;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import app.keel.training.TrainingCalls;
import app.keel.training.PlannedDays;
import app.keel.training.TrainingStatusReader;
import java.math.BigDecimal;
import java.math.MathContext;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.OptionalInt;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.function.Supplier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The weekly call (K-212, ADR-003): the Snapshot from the modules' APIs — the profile, the daily weights, this week's
 * answers, the plan — never their tables; the engine decides; the call is kept with its Snapshot and the parameters'
 * hash. The week is the user's check-in day in their own time zone (L3 P13).
 *
 * <p>What the data says is read, not asked (K-213): how it looks from the week's photo check, where the waist went over
 * the decision window. The plan's target is in it (K-216), with the exercise burn not known. The fat estimate comes from
 * the look picked and the waist (K-224; U4: internal only). Where training stands is read from the set log (K-221, TrainingStatusReader); adherence is counted from
 * the logs over the window (K-220, WeekLogs).
 *
 * <p>Applying a call (K-216): only the latest, only what it is about, and only on the plan it judged; the call keeps when
 * it was applied and undone and the plan before and after. Declining it (K-963, ADR-077 #3) keeps last week's plan and
 * the call on record, unchanged (U2); never a call resting on the safety net (U13).
 */
@Service
class DecisionService {

    private final CallStore calls;
    private final Profiles profiles;
    private final Measurements measurements;
    private final ConsentGate consent;
    private final ParameterSet parameters;
    private final QuestionBudget budget;
    private final Clock clock;
    private final WeekLogs logs;
    private final TrainingCalls training;
    private final TrainingStatusReader statuses;
    private final PlannedSessions planned;
    private final StateStore states;
    private final AccountDates accounts;

    private static final int DAYS_PER_WEEK = 7;

    DecisionService(CallStore calls, Profiles profiles, Measurements measurements, ConsentGate consent, ParameterSet parameters,
            QuestionBudget budget, Clock clock, WeekLogs logs, TrainingCalls training, TrainingStatusReader statuses, StateStore states,
            AccountDates accounts, PlannedSessions planned) {
        this.planned = planned;
        this.accounts = accounts;
        this.states = states;
        this.statuses = statuses;
        this.logs = logs;
        this.training = training;
        this.calls = calls;
        this.profiles = profiles;
        this.measurements = measurements;
        this.consent = consent;
        this.parameters = parameters;
        this.budget = budget;
        this.clock = clock;
    }

    /** Contract CheckIn: this week, the questions it needs (none once answered), whether it has been answered. */
    record CheckInView(LocalDate weekOf, List<CheckInQuestions.Question> questions, boolean answered) {
    }

    /** What the week's check-in reads: the user's calendar, body and parameters, and what the data already says. */
    private record Week(ProfileFacts profile, LocalDate today, LocalDate weekOf, Sex sex, Parameters parameters, Profile body,
            List<WeighIn> weights, CheckIn dataSays, Optional<FatEstimate.Estimate> fatEstimate, Optional<BigDecimal> fatForEnergy,
            boolean safetyHold, Optional<DeclaredContext> declared, OptionalInt waistSpanDays, Optional<FirstWeekAdjustment.Week> firstWeek) {

        Week withFirstWeek(Optional<FirstWeekAdjustment.Week> week) {
            return new Week(profile, today, weekOf, sex, parameters, body, weights, dataSays, fatEstimate, fatForEnergy, safetyHold, declared,
                    waistSpanDays, week);
        }
    }

    /** The fat estimate's inputs: the latest look and the waist's RFM (K-224). */
    private record FatInputs(Optional<BigDecimal> fromLook, Optional<BigDecimal> fromWaist) {
    }

    /** This week's check-in and its questions (K-213): only what the engine would wait for, within the budget. */
    @Transactional(readOnly = true)
    CheckInView currentCheckIn(AccountId account) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        Week read = week(account);
        if (taken(account, read.weekOf())) {
            return new CheckInView(read.weekOf(), List.of(), true);
        }
        if (beforeTheFirstCall(account, read)) {
            throw new ApiException(ErrorCode.NOT_FOUND);
        }
        Week week = closingTheFirstWeek(account, read);
        // Before the first call there is no plan yet: the first one, as the answers would start it, not stored; likewise
        // the estimate a plan without a target would get.
        CallStore.Plan plan = calls.plan(account).map(existing -> withEstimate(existing, week)).orElseGet(() -> firstPlan(week));
        CheckIn dataSays = dataSays(week, counted(account, week, plan));
        Optional<TrainingStatus> training = training(account, week);
        // The cycle question first, outside the budget: a safety question (V4, ADR-020 L-1), asked in the low energy band —
        // and after a hard stop, when this week's call, on the data or on the answers asked for, would open a deficit
        // again and waits for it (K-229).
        Function<CheckIn, Decision> engine = engine(week, plan, training);
        // The data disagreeing with itself, or a risky week of the first eight (K-513), opens the larger budget.
        boolean firstWeeksRisk = firstWeeks(account, week.profile(), week.today(), week.parameters(), () -> week)
                .map(first -> !first.risk().isEmpty()).orElse(false);
        int weekBudget = budget.forWeek(CheckInQuestions.largerBudget(dataSays, plan.phase(), firstWeeksRisk));
        List<Answers.Kind> spine = CheckInQuestions.needed(engine, dataSays, weekBudget);
        List<Answers.Kind> asked = new ArrayList<>();
        Snapshot unanswered = snapshot(week, plan, dataSays, false, false, training);
        if (CheckInQuestions.asksAboutTheCycle(week.sex(), SafetyNet.energyAvailability(unanswered, week.parameters()))
                || CheckInQuestions.cycleAwaited(engine, dataSays, spine)) {
            asked.add(Answers.Kind.CYCLE_STOPPED);
        }
        asked.addAll(spine);
        // The third paused week running (K-516, ADR-038 #5): once, inside the budget.
        if (spine.size() < weekBudget && CheckInQuestions.asksWhetherStillSo(states.current(account, week.today()).isPresent(),
                states.days(account, week.today().minusWeeks(budget.stillAfterPausedWeeks()), week.today()), week.today(),
                budget.stillAfterPausedWeeks(), states.lastStillSo(account))) {
            asked.add(Answers.Kind.STATE_STILL);
        }
        return new CheckInView(week.weekOf(), asked.stream().map(CheckInQuestions::describe).toList(), false);
    }

    /**
     * This week's call from these answers. A clientId sent again gets the call it made (the engine does not run twice);
     * another week's answers, or a second call this week, are CONFLICT; an answer the engine never waits for is refused.
     */
    @Transactional
    CallStore.Call checkIn(AccountId account, UUID clientId, LocalDate weekOf, List<Answers.Answer> answered) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        Optional<CallStore.Call> replay = calls.byClient(account, clientId);
        if (replay.isPresent()) {
            return replay.get();
        }
        Week read = week(account);
        if (!weekOf.equals(read.weekOf()) || taken(account, weekOf) || beforeTheFirstCall(account, read)) {
            throw new ApiException(ErrorCode.CONFLICT);
        }
        Week week = closingTheFirstWeek(account, read);
        Answers.Read answers;
        try {
            answers = Answers.read(answered, week.sex());
        } catch (IllegalArgumentException unreadable) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, unreadable);
        }
        // What the data says (look, waist) is not overwritten by an answer. A question the engine can wait for is taken
        // even if this moment's data would not ask it: data can change between asking and answering (K-213 review).
        if (!answered.stream().map(Answers.Answer::kind).allMatch(CheckInQuestions::answerable)) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        CallStore.Plan plan = calls.plan(account).map(existing -> {
            CallStore.Plan estimated = withEstimate(existing, week);
            if (!estimated.equals(existing)) {
                calls.replace(account, estimated);
            }
            return estimated;
        }).orElseGet(() -> calls.start(account, firstPlan(week)));
        // Not still so (K-516): the state ends yesterday; this week, declared, still waits.
        if (answers.stateOver()) {
            states.end(account, week.today());
        }
        // Still so (K-525): the question waits as many weeks from today.
        if (answers.stillSo()) {
            states.stillSo(account, week.today());
        }
        Optional<Consistency.WindowCount> counted = counted(account, week, plan);
        CheckIn dataSays = dataSays(week, counted);
        // Appetite and how the first week felt are the user's answers (K-227, ADR-077 #4): no data says them.
        CheckIn checkIn = new CheckIn(dataSays.look(), answers.checkIn().training(), answers.checkIn().recovery(), dataSays.waist(),
                dataSays.adherence(), answers.checkIn().appetite(), week1Feel(answers.checkIn().week1Feel(), week.firstWeek().isPresent()));
        Snapshot snapshot = snapshot(week, plan, checkIn, answers.menstrualLossReported(), answers.cycleResolved(), training(account, week));
        Decision decision = DecisionPipeline.decide(snapshot, week.parameters());
        CallStore.Call call = new CallStore.Call(UUID.randomUUID(), clientId, weekOf, week.today(), clock.instant(), parameters.versionHash(),
                StoredSnapshot.of(snapshot, counted, week.waistSpanDays()), DecisionJson.of(decision), application(decision));
        if (!calls.keep(account, call)) {
            // The same clientId or this week, stored at the same moment by another request.
            return calls.byClient(account, clientId).orElseThrow(() -> new ApiException(ErrorCode.CONFLICT));
        }
        return call;
    }

    /** The profile, today and the week on the user's calendar, the body, the weights, and what the data says (look, waist). */
    private Week week(AccountId account) {
        // The Snapshot needs the user's sex, height, birth year and check-in day.
        ProfileFacts profile = profiles.of(account).orElseThrow(() -> new ApiException(ErrorCode.CONFLICT));
        LocalDate today = LocalDate.now(clock.withZone(profile.timeZone()));
        int age = today.getYear() - profile.birthYear();
        if (age < 1) {
            // Born this year (or next, on a calendar behind UTC): no body the engine can read (K-212 review).
            throw new ApiException(ErrorCode.CONFLICT);
        }
        Sex sex = Sex.valueOf(profile.sex().name());
        Parameters p = parameters.forSex(sex);
        List<WeighIn> weights = measurements.dailyWeights(account, today.minusDays(p.wholeNumber(ParameterKey.EVALUATION_WINDOW_DAYS) - 1L), today);
        // The photo check (the phone compared it; V1) from seven days before the week's check-in day: the window starts
        // with the week, so it does not slide off a check at midnight. The waist over the decision window.
        LocalDate weekOf = CheckInWeek.weekOf(today, profile.checkInDay());
        CheckIn.Look look = measurements.photoLook(account, weekOf.minusDays(DAYS_PER_WEEK - 1L), today).orElse(CheckIn.Look.UNKNOWN);
        List<WaistTrend.Reading> waists = measurements.waists(account, today.minusDays(p.wholeNumber(ParameterKey.DECISION_WINDOW_DAYS) - 1L), today);
        CheckIn.Waist waist = WaistTrend.direction(waists, p);
        CheckIn dataSays = new CheckIn(look, CheckIn.Training.UNKNOWN, CheckIn.Recovery.UNKNOWN, waist, Optional.empty(), CheckIn.Appetite.UNKNOWN);
        FatInputs fat = fatInputs(account, profile, today, p);
        return new Week(profile, today, weekOf, sex, p, new Profile(age, profile.heightCm()), weights, dataSays,
                FatEstimate.of(fat.fromLook(), fat.fromWaist()), FatEstimate.forEnergy(fat.fromLook(), fat.fromWaist(), p),
                SafetyHolds.from(calls.outcomes(account)),
                // A state declared on a day of this check-in week (K-516, ADR-038).
                states.latest(account, today.minusDays(DAYS_PER_WEEK - 1L), today), WaistTrend.spanDays(waists), Optional.empty());
    }

    /**
     * How the first week felt, as the call reads it: only the check-in that closes the first week reads it; sent in any
     * other week it is taken (a question shown is never refused) but neither read nor kept.
     */
    static CheckIn.Week1Feel week1Feel(CheckIn.Week1Feel answered, boolean closesTheFirstWeek) {
        return closesTheFirstWeek ? answered : CheckIn.Week1Feel.UNKNOWN;
    }

    /**
     * The week with the first week's facts when its check-in closes it (K-962, ADR-077 #4): the program's weekdays, the
     * profile's when it puts none on a weekday (K-527); the sessions from the logs; the experience from the profile.
     */
    private Week closingTheFirstWeek(AccountId account, Week week) {
        ZoneId zone = week.profile().timeZone();
        LocalDate began = firstDay(account, zone);
        if (!week.weekOf().equals(FirstWeekFacts.closingCheckIn(began, week.profile().checkInDay()))) {
            return week;
        }
        Set<DayOfWeek> programDays = statuses.programDays(account);
        Set<DayOfWeek> trainingDays = programDays.isEmpty() ? week.profile().trainingDays() : programDays;
        // A session moved in its week is planned where it was moved, not on its weekday (K-964).
        PlannedDays plannedDays = programDays.isEmpty() ? PlannedDays.weekly(trainingDays)
                : statuses.plannedDays(account, began, week.weekOf()).orElse(PlannedDays.weekly(trainingDays));
        return week.withFirstWeek(FirstWeekFacts.of(began, week.profile().checkInDay(), week.weekOf(), plannedDays::on,
                logs.sessionDays(account, zone, began, week.weekOf()), planned.perWeek(account, week.profile()),
                week.profile().experience().map(experience -> Experience.valueOf(experience.name()))));
    }

    /**
     * The engine's internal fat estimate (K-224, ADR-027 #11; U4: it leaves the engine as nothing but its decisions): the
     * latest look picked and the latest waist day in the evaluation window, both kept as the lower and the higher (H8 C),
     * and for the low-energy rule the waist's band read cautiously (K-230); a waist no body could have gives none (H8 A4).
     */
    private FatInputs fatInputs(AccountId account, ProfileFacts profile, LocalDate today, Parameters p) {
        LocalDate from = today.minusDays(p.wholeNumber(ParameterKey.EVALUATION_WINDOW_DAYS) - 1L);
        Optional<BigDecimal> fromLook = measurements.latestLookLevel(account, from, today)
                .filter(level -> level <= FatEstimate.levels(p)).map(level -> FatEstimate.fromLook(level, p));
        List<WaistTrend.Reading> waists = measurements.waists(account, from, today);
        Optional<BigDecimal> fromWaist = waists.stream().map(WaistTrend.Reading::day).max(LocalDate::compareTo).flatMap(last -> {
            List<BigDecimal> onLastDay = waists.stream().filter(reading -> reading.day().equals(last)).map(WaistTrend.Reading::cm).toList();
            BigDecimal cm = onLastDay.stream().reduce(BigDecimal.ZERO, BigDecimal::add).divide(BigDecimal.valueOf(onLastDay.size()), MathContext.DECIMAL64);
            return FatEstimate.rfm(profile.heightCm(), cm, p);
        });
        return new FatInputs(fromLook, fromWaist);
    }

    /**
     * The first day on the user's calendar (K-990, ADR-077 Ek 2): the day onboarding finished; for a profile saved before
     * that was kept, the first sign-in. The first week, the first call's day and the first eight weeks all count from it.
     */
    private LocalDate firstDay(AccountId account, ZoneId zone) {
        return FirstWeekFacts.firstDay(profiles.onboardedAt(account), () -> accounts.began(account), zone);
    }

    /**
     * No call yet and the first call's day not come (K-990): the first week is watched, not decided on (U8) — the same rule
     * for offering the check-in and for taking its answers. Once a call is made, the weeks turn as they always did.
     */
    private boolean beforeTheFirstCall(AccountId account, Week week) {
        return calls.firstMadeOn(account).isEmpty()
                && !FirstWeekFacts.firstCallOpen(firstDay(account, week.profile().timeZone()), week.profile().checkInDay(), week.today());
    }

    /** One call a week (K-212): the same rule for offering the check-in and for taking its answers. */
    private boolean taken(AccountId account, LocalDate weekOf) {
        return CheckInWeek.taken(weekOf, calls.newestFirst(account, Optional.empty(), 1).stream().findFirst().map(CallStore.Call::weekOf));
    }

    /** The engine on this week's data with the answers tried, before any cycle answer (the questions are found with it). */
    private Function<CheckIn, Decision> engine(Week week, CallStore.Plan plan, Optional<TrainingStatus> training) {
        return checkIn -> DecisionPipeline.decide(snapshot(week, plan, checkIn, false, false, training), week.parameters());
    }

    /** What the data says, with how the plan was followed over the window, counted from the logs (K-220). */
    private CheckIn dataSays(Week week, Optional<Consistency.WindowCount> counted) {
        return counted.map(count -> week.dataSays().withAdherence(count.ratio())).orElse(week.dataSays());
    }

    /** The window's count from the logs (K-220): its ratio is the adherence the engine reads; its numbers are kept (K-526). */
    private Optional<Consistency.WindowCount> counted(AccountId account, Week week, CallStore.Plan plan) {
        return logs.adherence(account, week.profile(), week.today(), plan, bodyweight(account, week), week.body().ageYears(), week.parameters());
    }

    // Today's trend weight, or the last weight known however old (K-216 review).
    private Optional<BigDecimal> bodyweight(AccountId account, Week week) {
        return WeightTrend.at(new WeightSeries(week.weights()), week.today(), week.parameters().wholeNumber(ParameterKey.TREND_DISPLAY_DAYS))
                .or(() -> measurements.latestWeightKg(account));
    }

    /** Where training stands, from the set log (K-221): read once per check-in, only where the engine runs. */
    private Optional<TrainingStatus> training(AccountId account, Week week) {
        // A week with a declared day is neither kept nor missed (K-516, ADR-038).
        return statuses.status(account, week.today(), week.profile().timeZone(), week.profile().checkInDay(),
                states.daysUpTo(account, week.today()));
    }

    private Snapshot snapshot(Week week, CallStore.Plan plan, CheckIn checkIn, boolean menstrualLossReported, boolean cycleResolved,
            Optional<TrainingStatus> training) {
        if (plan.planStart().isAfter(week.today())) {
            // The plan began on a later date than today on the user's calendar now (a time zone moved west).
            throw new ApiException(ErrorCode.CONFLICT);
        }
        // The plan's target is what the calorie ladder moves (K-216); what training burns is not known yet.
        Snapshot snapshot = new Snapshot(week.today(), week.sex(), plan.phase(), plan.planStart(), new WeightSeries(week.weights()),
                week.fatEstimate().map(FatEstimate.Estimate::lowerPct), Optional.ofNullable(plan.targetKcal()).map(EnergyBudget::exerciseUnknown),
                menstrualLossReported, checkIn, Optional.of(week.body()), plan.observingMaintenance(), plan.phaseStart(), training,
                week.fatEstimate().map(FatEstimate.Estimate::higherPct), week.safetyHold(), cycleResolved, Optional.ofNullable(plan.miniCutUntil()),
                week.fatForEnergy(), week.declared());
        // The check-in that closes the first week: its call comes from the sessions (K-962).
        return week.firstWeek().map(snapshot::withFirstWeek).orElse(snapshot);
    }

    /**
     * The first plan: the direction the user chose, and the starting target — the maintenance estimate, watched before
     * it is judged (K-114). Without a weigh-in there is no estimate yet; the engine says there is not enough data.
     */
    private CallStore.Plan firstPlan(Week week) {
        return new CallStore.Plan(startingPhase(week.profile(), week.fatEstimate(), week.parameters()), week.today(), week.today(), estimate(week),
                true, null);
    }

    /** The direction the user chose; "Decide for me", the phase gate on the fat estimate — without one, a cut (ADR-027 #17, G4 K-4). */
    private static Phase startingPhase(ProfileFacts profile, Optional<FatEstimate.Estimate> fat, Parameters p) {
        return switch (profile.goal()) {
            case LOSE_FAT -> Phase.CUT;
            case BUILD_MUSCLE -> Phase.BULK;
            case DECIDE_FOR_ME -> PhaseGate.startingPhase(fat.map(FatEstimate.Estimate::lowerPct), fat.map(FatEstimate.Estimate::higherPct), p);
        };
    }

    /**
     * The phase in force, for training's cardio (K-959, ADR-074 #1, through CurrentPhase): the plan's, or before the first
     * call the one the first plan would start with, as the check-in would start it. None without a profile. No consent
     * check: without the health data consent there is no plan nor measurement to read (K-231), and the goal decides.
     */
    @Transactional(readOnly = true)
    Optional<Phase> phaseNow(AccountId account) {
        Optional<CallStore.Plan> plan = calls.plan(account);
        if (plan.isPresent()) {
            return Optional.of(plan.get().phase());
        }
        return profiles.of(account).map(profile -> {
            Parameters p = parameters.forSex(Sex.valueOf(profile.sex().name()));
            FatInputs fat = fatInputs(account, profile, LocalDate.now(clock.withZone(profile.timeZone())), p);
            return startingPhase(profile, FatEstimate.of(fat.fromLook(), fat.fromWaist()), p);
        });
    }

    /** The maintenance estimate at the last weigh-in of the window (K-114); none without one. */
    private Integer estimate(Week week) {
        return startingEstimate(week).map(InitialTarget.Estimate::maintenanceKcal).orElse(null);
    }

    /** The engine's estimate the first plan's target is (K-114), with its range (U5); none without a weigh-in in the window. */
    private Optional<InitialTarget.Estimate> startingEstimate(Week week) {
        return week.weights().isEmpty() ? Optional.empty() : Optional.of(InitialTarget.estimate(week.sex(), week.weights().getLast().kg(),
                week.body(), week.profile().activity().map(activity -> ActivityLevel.valueOf(activity.name())), week.parameters()));
    }

    /**
     * The plan-ready screen's food row (K-989, ADR-072 #6): the first plan as the first call would start it on today's
     * inputs — the same computation, not a second formula (U1) — and nothing stored, as it is not a call. Once the plan has
     * begun, its targets are the plan's (CONFLICT); without a weigh-in the first call would start without one (NOT_FOUND).
     */
    @Transactional(readOnly = true)
    StartingTarget startingTarget(AccountId account) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        if (calls.plan(account).isPresent()) {
            throw new ApiException(ErrorCode.CONFLICT);
        }
        Week week = week(account);
        InitialTarget.Estimate estimate = startingEstimate(week).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        return StartingTarget.of(firstPlan(week), estimate, week.parameters());
    }

    /**
     * The maintenance estimate a new direction or the hard stop starts from: at today's trend weight, or the last weight
     * known however old (K-222 review — without it, a hard stop would keep the cut target). None before any weigh-in.
     */
    private Optional<Integer> maintenance(AccountId account, Week week) {
        return bodyweight(account, week).map(kg -> InitialTarget.estimate(week.sex(), kg, week.body(),
                week.profile().activity().map(activity -> ActivityLevel.valueOf(activity.name())), week.parameters()).maintenanceKcal());
    }

    /**
     * A plan begun before any weigh-in has no target: once there is a weight, the estimate starts, watched (K-114) from
     * today — else it would stay without one for good (K-216 review).
     */
    private CallStore.Plan withEstimate(CallStore.Plan plan, Week week) {
        Integer estimate = estimate(week);
        if (plan.targetKcal() != null || estimate == null) {
            return plan;
        }
        LocalDate start = week.today().isAfter(plan.planStart()) ? week.today() : plan.planStart();
        return new CallStore.Plan(plan.phase(), plan.phaseStart(), start, estimate, true, plan.stepsPerDay());
    }

    /**
     * Whether the call changes the plan (applied by K-216): a pause, "continue" or advice changes nothing; nor do the first
     * week's training-day calls, whose day the user picks.
     */
    static CallStore.Application application(Decision decision) {
        return switch (decision.action()) {
            case app.keel.engine.Action.NoDecisionYet _, app.keel.engine.Action.Continue _, app.keel.engine.Action.FixTraining _,
                 app.keel.engine.Action.FixRecovery _, app.keel.engine.Action.FixAdherence _ -> CallStore.Application.NOT_NEEDED;
            // The first week's training days: the user picks the day (ADR-077 #4), with the training days, not through apply.
            case app.keel.engine.Action.AddTrainingDay _, app.keel.engine.Action.MoveMissedSessions _ -> CallStore.Application.NOT_NEEDED;
            default -> CallStore.Application.PENDING;
        };
    }

    /**
     * Applies the current call (K-216): only the one thing it is about moves (U3), and the call keeps when and the plan
     * before and after. A declined call is applied the same way ("Use this call", K-963): its plan is last week's again.
     * Applied twice, nothing more changes; a call that changes nothing, one undone, one not the latest, or one whose kind
     * is not applied here is CONFLICT.
     */
    @Transactional
    PlanTargets apply(AccountId account, UUID id) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        CallStore.Call call = latest(account, id);
        if (call.application() == CallStore.Application.APPLIED) {
            return targetsAfter(account);
        }
        if (call.application() != CallStore.Application.PENDING && call.application() != CallStore.Application.DECLINED) {
            throw new ApiException(ErrorCode.CONFLICT);
        }
        Week week = week(account);
        CallStore.Plan before = calls.plan(account).orElseThrow(() -> new ApiException(ErrorCode.CONFLICT));
        // The call judged a target; if the plan holds another one now (a call applied while this one was being made), its
        // step would land on top of that one (K-216 review).
        Integer judged = call.snapshot().energy() == null ? null : call.snapshot().energy().targetKcal();
        if (!Objects.equals(judged, before.targetKcal())) {
            throw new ApiException(ErrorCode.CONFLICT);
        }
        Action action = DecisionJson.action(call.decision());
        Optional<Integer> maintenance = maintenance(account, week);
        CallStore.Plan after = (onTheProgram(account, id, action, week.today(), LocalDate.parse((String) call.decision().get("nextReview")))
                ? Optional.of(before)
                : PlanChange.after(before, action, week.today(), week.parameters(), maintenance, miniCutTarget(action, week, before, maintenance)))
                .orElseThrow(() -> new ApiException(ErrorCode.CONFLICT));
        // Only the request that moved the call from PENDING (or DECLINED) changes the plan; another one at the same moment reads it.
        if (calls.markApplied(account, id, clock.instant(), before, after)) {
            calls.replace(account, after);
        }
        return targetsAfter(account);
    }

    /**
     * The mini cut's target (K-227): from maintenance — or the plan's own target without an estimate — under today's data
     * and the engine's floors. Empty for any other call, and with neither.
     */
    private Optional<Integer> miniCutTarget(Action action, Week week, CallStore.Plan before, Optional<Integer> maintenance) {
        if (!(action instanceof Action.MiniCut)) {
            return Optional.empty();
        }
        Snapshot today = snapshot(week, before, CheckIn.NONE, false, false, Optional.empty());
        return maintenance.or(() -> Optional.ofNullable(before.targetKcal())).map(kcal -> MiniCutGate.target(today, kcal, week.parameters()));
    }

    /**
     * Puts the plan back as it was before the call (kept in the audit trail). Undone twice, nothing more changes. The hard
     * stop is CONFLICT: it is not taken back (ADR-020 L-1).
     */
    @Transactional
    PlanTargets undo(AccountId account, UUID id) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        CallStore.Call call = latest(account, id);
        if (call.application() == CallStore.Application.UNDONE) {
            return targetsAfter(account);
        }
        if (call.application() != CallStore.Application.APPLIED || !PlanChange.undoable(DecisionJson.action(call.decision()))) {
            throw new ApiException(ErrorCode.CONFLICT);
        }
        if (calls.markUndone(account, id, clock.instant())) {
            calls.replace(account, call.planBefore());
            training.undo(account, id);
        }
        return targetsAfter(account);
    }

    /**
     * "Keep last week's plan" (K-963, ADR-077 #3): the call stays on record, unchanged (U2), and is not applied — a pending
     * one changes nothing; one applied (the default) is taken back exactly as an undo would: the plan before it and the
     * program change it made. The next week's call reads the plan as it is, so the declined one as not applied. Declined
     * twice, nothing more changes. A call resting on the safety net is never declined (U13), nor one that changes nothing,
     * one undone, or one not the latest: CONFLICT.
     */
    @Transactional
    PlanTargets decline(AccountId account, UUID id) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        CallStore.Call call = latest(account, id);
        if (SafetyCalls.restsOnTheSafetyNet(call.decision())) {
            throw new ApiException(ErrorCode.CONFLICT);
        }
        switch (call.application()) {
            case DECLINED -> {
                return targetsAfter(account);
            }
            case PENDING -> calls.markDeclined(account, id, clock.instant());
            case APPLIED -> {
                // The hard stop is the only call not taken back (ADR-020 L-1), and it rests on the safety net: kept as a guard.
                if (!PlanChange.undoable(DecisionJson.action(call.decision()))) {
                    throw new ApiException(ErrorCode.CONFLICT);
                }
                if (calls.markDeclined(account, id, clock.instant())) {
                    calls.replace(account, call.planBefore());
                    training.undo(account, id);
                }
            }
            case NOT_NEEDED, UNDONE -> throw new ApiException(ErrorCode.CONFLICT);
        }
        return targetsAfter(account);
    }

    /**
     * Whether "Keep last week's plan" may be offered on this call now (K-963, contract Decision.declinable): the latest
     * call, PENDING or APPLIED, not resting on the safety net (U13). The phone reads this; it never learns the safety
     * net's rules (K2).
     */
    static boolean declinable(CallStore.Call call, boolean latest) {
        boolean open = call.application() == CallStore.Application.PENDING || call.application() == CallStore.Application.APPLIED;
        return latest && open && !SafetyCalls.restsOnTheSafetyNet(call.decision());
    }

    /** The id of the account's latest call, the only one that can be applied, undone or declined; the caller has checked consent. */
    Optional<UUID> latestId(AccountId account) {
        return calls.newestFirst(account, Optional.empty(), 1).stream().findFirst().map(CallStore.Call::id);
    }

    /**
     * The deload ladder's calls go to the program (K-217): hold the load from today; a lighter week or a week off from
     * today until the day before the call's next review, when the next call decides again. CONFLICT without a program.
     * False for any other call: it is the plan's.
     */
    private boolean onTheProgram(AccountId account, UUID id, Action action, LocalDate today, LocalDate nextReview) {
        boolean applied = switch (action) {
            case Action.StopLoadIncrease _ -> training.holdLoad(account, id, today);
            case Action.Deload(BigDecimal setsFactor) -> training.lighterWeek(account, id, setsFactor, today, lastDayBefore(today, nextReview));
            case Action.FullRestWeek _ -> training.restWeek(account, id, today, lastDayBefore(today, nextReview));
            default -> {
                yield false;
            }
        };
        boolean programs = action instanceof Action.StopLoadIncrease || action instanceof Action.Deload || action instanceof Action.FullRestWeek;
        if (programs && !applied) {
            throw new ApiException(ErrorCode.CONFLICT);
        }
        return programs;
    }

    private static LocalDate lastDayBefore(LocalDate today, LocalDate nextReview) {
        LocalDate last = nextReview.minusDays(1);
        return last.isBefore(today) ? today : last;
    }

    /**
     * This week's consistency and the record since the first call (K-420): health data (weigh-ins, protein), so with the
     * consent; NOT_FOUND before the first call, when nothing is planned yet.
     */
    @Transactional(readOnly = true)
    ConsistencyNow consistency(AccountId account) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        CallStore.Plan plan = calls.plan(account).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        Week week = week(account);
        LocalDate firstCall = calls.firstMadeOn(account).orElse(plan.phaseStart());
        WeekLogs.Now now = logs.consistency(account, week.profile(), week.today(), plan, firstCall, bodyweight(account, week), week.body().ageYears(),
                week.parameters());
        // The period's weight change (K-988, ADR-078 Ek 1): from the trend window ending on the record's first day to today's.
        int window = week.parameters().wholeNumber(ParameterKey.TREND_DISPLAY_DAYS);
        WeightSeries weights = new WeightSeries(measurements.dailyWeights(account, firstCall.minusDays(window - 1L), week.today()));
        return new ConsistencyNow(now, firstCall, WeightChange.of(weights, firstCall, week.today(), week.parameters()));
    }

    /** This week's consistency and the record (K-420), and the period's weight change since the record began (K-988). */
    record ConsistencyNow(WeekLogs.Now now, LocalDate since, Optional<BigDecimal> weightChange) {
    }

    /**
     * The first call's day the app names (K-990, contract FirstWeeks.firstCallOn) until the first call is made: the check-in
     * day that closes the first week, or today once it has come.
     */
    @Transactional(readOnly = true)
    Optional<LocalDate> firstCallOn(AccountId account) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        ProfileFacts profile = profiles.of(account).orElseThrow(() -> new ApiException(ErrorCode.CONFLICT));
        if (calls.firstMadeOn(account).isPresent()) {
            return Optional.empty();
        }
        LocalDate today = LocalDate.now(clock.withZone(profile.timeZone()));
        return Optional.of(FirstWeekFacts.firstCallOn(firstDay(account, profile.timeZone()), profile.checkInDay(), today));
    }

    /** The first eight weeks (K-513, ADR-040): this week of the flow; empty before the first day and once it is over. */
    @Transactional(readOnly = true)
    Optional<FirstWeeks.Week> firstWeeks(AccountId account) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        ProfileFacts profile = profiles.of(account).orElseThrow(() -> new ApiException(ErrorCode.CONFLICT));
        LocalDate today = LocalDate.now(clock.withZone(profile.timeZone()));
        // The whole week (weights, look, waist) only when the risk reads consistency's weeks: not for a week that says nothing.
        return firstWeeks(account, profile, today, parameters.forSex(Sex.valueOf(profile.sex().name())), () -> week(account));
    }

    /**
     * The flow's week on the user's calendar. Nothing is read once the flow is over, and nothing of the week just over
     * before the risk reads it (ADR-040 #5). Then: the user's week just over and the one before it, from the logs; the
     * ladder's week off pauses it as a declared state does (K-435: a week of rest is quiet); consistency's weeks from the
     * record, none before a plan.
     */
    private Optional<FirstWeeks.Week> firstWeeks(AccountId account, ProfileFacts profile, LocalDate today, Parameters p, Supplier<Week> week) {
        ZoneId zone = profile.timeZone();
        LocalDate began = firstDay(account, zone);
        boolean trainingPlanned = planned.perWeek(account, profile) > 0;
        if (!FirstWeeks.readsRisk(began, today, p)) {
            return FirstWeeks.of(new FirstWeeks.Facts(today, began, trainingPlanned, new FirstWeeks.UserWeek(0, 0, false), 0, List.of()), p);
        }
        LocalDate lastWeek = FirstWeeks.weekStart(began, today).minusWeeks(1);
        FirstWeeks.UserWeek last = logs.userWeek(account, zone, lastWeek);
        boolean rested = !statuses.breaks(account, lastWeek, lastWeek.plusDays(DAYS_PER_WEEK - 1L)).rest().isEmpty();
        List<WeekTally> calendar = calls.plan(account).map(plan -> {
            Week read = week.get();
            return logs.consistency(account, profile, today, plan, calls.firstMadeOn(account).orElse(plan.phaseStart()), bodyweight(account, read),
                    read.body().ageYears(), p).weeksOver();
        }).orElse(List.of());
        // The week just over is judged by what it asked (K-535): a program made since asks nothing of it.
        boolean askedLastWeek = trainingPlanned && planned.askedSince(account, profile, lastWeek);
        return FirstWeeks.of(new FirstWeeks.Facts(today, began, trainingPlanned, askedLastWeek,
                new FirstWeeks.UserWeek(last.sessions(), last.loggedDays(), last.paused() || rested),
                logs.loggedDays(account, lastWeek.minusWeeks(1)), calendar), p);
    }

    /** The targets the user follows today; NOT_FOUND before the first estimate. */
    @Transactional(readOnly = true)
    PlanTargets targets(AccountId account) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        return targetsOf(account);
    }

    /** The day's targets for the food budget (DailyTargets); the caller has checked consent. Empty before the first estimate. */
    @Transactional(readOnly = true)
    Optional<PlanTargets> targetsNow(AccountId account) {
        Optional<CallStore.Plan> plan = calls.plan(account).filter(p -> p.targetKcal() != null);
        if (plan.isEmpty()) {
            return Optional.empty();
        }
        Week week = week(account);
        // Today's trend weight, or the last weight known however old: a user who stopped weighing in can still read the
        // targets and take a call back (K-216 review). A target exists only after a weigh-in, so there is always one.
        BigDecimal bodyweight = bodyweight(account, week).orElseThrow(() -> new ApiException(ErrorCode.CONFLICT));
        return Optional.of(PlanTargets.of(plan.get(), bodyweight, week.sex(), week.body().ageYears(), planned.perWeek(account, week.profile()),
                week.parameters())
                .orElseThrow(() -> new ApiException(ErrorCode.CONFLICT)));
    }

    /**
     * The targets after an apply or undo: without a calorie target yet (a training call on a plan that has none, K-217
     * review), what is known — the steps and the training days — rather than NOT_FOUND for a call that was applied.
     */
    private PlanTargets targetsAfter(AccountId account) {
        return targetsNow(account).orElseGet(() -> {
            Week week = week(account);
            return PlanTargets.withoutCalories(calls.plan(account).orElseThrow(() -> new ApiException(ErrorCode.CONFLICT)), planned.perWeek(account, week.profile()),
                    week.parameters());
        });
    }

    private PlanTargets targetsOf(AccountId account) {
        return targetsNow(account).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
    }

    /** The call, if it is the latest: an older one is history (CONFLICT), a missing one NOT_FOUND. */
    private CallStore.Call latest(AccountId account, UUID id) {
        CallStore.Call call = calls.lockedById(account, id).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        boolean latest = calls.newestFirst(account, Optional.empty(), 1).stream().findFirst().map(newest -> newest.id().equals(id)).orElse(false);
        if (!latest) {
            throw new ApiException(ErrorCode.CONFLICT);
        }
        return call;
    }

    Optional<CallStore.Call> current(AccountId account) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        return calls.newestFirst(account, Optional.empty(), 1).stream().findFirst();
    }

    Optional<CallStore.Call> find(AccountId account, UUID id) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        return calls.byId(account, id);
    }

    /** The trend weight a kept call read (K-611); none when it read no window. */
    Optional<BigDecimal> trendRead(CallStore.Call call) {
        return DecisionBasis.trendRead(call.snapshot(), parameters.forSex(call.snapshot().sex()));
    }

    /**
     * "What would change the call" (K-610): example weeks from today, run through the pipeline — for the latest call only,
     * and from the plan in force now (an applied call has changed it: the call's own snapshot would be stale). The data says
     * what it says today; recovery and appetite are the latest call's answers (the examples set training and the plan).
     * None for a safety call (ADR-028 #24) or an older one.
     */
    Optional<Map<String, Object>> whatIf(AccountId account, UUID id) {
        Optional<CallStore.Call> latest = current(account).filter(call -> call.id().equals(id))
                .filter(call -> !Boolean.TRUE.equals(call.decision().get("safety")));
        Optional<CallStore.Plan> plan = calls.plan(account);
        if (latest.isEmpty() || plan.isEmpty()) {
            return Optional.empty();
        }
        Week week = week(account);
        CallStore.Plan inForce = withEstimate(plan.get(), week);
        CheckIn dataSays = dataSays(week, counted(account, week, inForce));
        StoredSnapshot.Answered answered = latest.get().snapshot().checkIn();
        CheckIn now = new CheckIn(dataSays.look(), CheckIn.Training.UNKNOWN, answered.recovery(), dataSays.waist(), dataSays.adherence(),
                answered.appetite());
        Snapshot today = snapshot(week, inForce, now, false, false, training(account, week));
        List<Map<String, Object>> scenarios = WhatIf.scenarios(today, week.parameters()).stream()
                .map(scenario -> Map.<String, Object>of("when", Map.of("trend", scenario.when().trend().name(),
                        "adherence", scenario.when().adherence().name(), "training", scenario.when().training().name()),
                        "decision", SourceView.sent(DecisionJson.of(scenario.decision()))))
                .toList();
        return Optional.of(Map.of("example", true, "scenarios", scenarios));
    }

    /**
     * The shape projection (K-613, ADR-052): the engine's numbers on today's trend weight and the plan in force — health data,
     * behind the consent. Before a plan with a calorie target there is nothing to project yet. Not shown: the reason by name.
     */
    Map<String, Object> projection(AccountId account) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        Optional<CallStore.Plan> plan = calls.plan(account);
        if (plan.isEmpty()) {
            return notShown(ShapeProjection.Closed.TOO_EARLY);
        }
        Week week = week(account);
        CallStore.Plan inForce = withEstimate(plan.get(), week);
        if (inForce.targetKcal() == null) {
            return notShown(ShapeProjection.Closed.TOO_EARLY);
        }
        // Held: a hard stop applied (SafetyHolds), or the latest call a safety call not yet applied — the plan still holds the
        // cut, but the call says stop (K-613 review, U13).
        boolean held = week.safetyHold() || current(account).filter(call -> Boolean.TRUE.equals(call.decision().get("safety"))).isPresent();
        ShapeProjection.Facts facts = new ShapeProjection.Facts(week.today(), week.sex(), week.body(),
                week.profile().activity().map(activity -> ActivityLevel.valueOf(activity.name())), inForce.phase(), new WeightSeries(week.weights()),
                inForce.targetKcal(), held);
        return switch (ShapeProjection.of(facts, week.parameters())) {
            case ShapeProjection.NotShown(ShapeProjection.Closed why) -> notShown(why);
            case ShapeProjection.Shown shown -> Map.of("shown", true, "todayKg", shown.todayKg(), "direction", shown.direction().name(),
                    "on", shown.on().toString(), "scenarios", shown.scenarios().stream()
                            .map(scenario -> Map.<String, Object>of("adherence", scenario.adherence(), "lowKg", scenario.lowKg(), "kg", scenario.kg(),
                                    "highKg", scenario.highKg()))
                            .toList());
        };
    }

    private static Map<String, Object> notShown(ShapeProjection.Closed why) {
        return Map.of("shown", false, "reason", why.name());
    }

    /** What the call read, from its own stored snapshot (K-519): read with the parameters for the sex it was made for. */
    Optional<DecisionBasis> basis(AccountId account, UUID id) {
        return find(account, id).map(call -> DecisionBasis.of(call.snapshot(), parameters.forSex(call.snapshot().sex())));
    }

    List<CallStore.Call> page(AccountId account, Optional<UUID> before, int limit) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        Optional<CallStore.Call> cursor = before.map(id -> calls.byId(account, id).orElseThrow(() -> new ApiException(ErrorCode.VALIDATION_FAILED)));
        return calls.newestFirst(account, cursor, limit);
    }
}
