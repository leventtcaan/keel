package app.keel.decision;

import app.keel.consent.ConsentGate;
import app.keel.consent.ConsentKind;
import app.keel.engine.Action;
import app.keel.engine.ActivityLevel;
import app.keel.engine.CheckIn;
import app.keel.engine.Decision;
import app.keel.engine.DecisionPipeline;
import app.keel.engine.EnergyBudget;
import app.keel.engine.InitialTarget;
import app.keel.engine.ParameterKey;
import app.keel.engine.ParameterSet;
import app.keel.engine.Parameters;
import app.keel.engine.Phase;
import app.keel.engine.Profile;
import app.keel.engine.Sex;
import app.keel.engine.Snapshot;
import app.keel.engine.WaistTrend;
import app.keel.engine.WeighIn;
import app.keel.engine.WeightSeries;
import app.keel.engine.WeightTrend;
import app.keel.measurement.Measurements;
import app.keel.profile.ProfileFacts;
import app.keel.profile.Profiles;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import app.keel.training.TrainingCalls;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The weekly call (K-212, ADR-003): the Snapshot from the modules' APIs — the profile, the daily weights, this week's
 * answers, the plan — never their tables; the engine decides; the call is kept with its Snapshot and the parameters'
 * hash. The week is the user's check-in day in their own time zone (L3 P13).
 *
 * <p>What the data says is read, not asked (K-213): how it looks from the week's photo check, where the waist went over
 * the decision window. The plan's target is in it (K-216), with the exercise burn not known. Not yet in the Snapshot, so
 * the engine treats them as unknown: the fat estimate (DURUM question 11 — without it the low-energy floor cannot be
 * computed) and where training stands (K-221). Adherence is counted from the logs over the window (K-220, WeekLogs).
 *
 * <p>Applying a call (K-216): only the latest, only what it is about, and only on the plan it judged; the call keeps when
 * it was applied and undone and the plan before and after.
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

    private static final int DAYS_PER_WEEK = 7;

    DecisionService(CallStore calls, Profiles profiles, Measurements measurements, ConsentGate consent, ParameterSet parameters,
            QuestionBudget budget, Clock clock, WeekLogs logs, TrainingCalls training) {
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
            List<WeighIn> weights, CheckIn dataSays) {
    }

    /** This week's check-in and its questions (K-213): only what the engine would wait for, within the budget. */
    @Transactional(readOnly = true)
    CheckInView currentCheckIn(AccountId account) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        Week week = week(account);
        if (taken(account, week.weekOf())) {
            return new CheckInView(week.weekOf(), List.of(), true);
        }
        // Before the first call there is no plan yet: the first one, as the answers would start it, not stored; likewise
        // the estimate a plan without a target would get.
        CallStore.Plan plan = calls.plan(account).map(existing -> withEstimate(existing, week)).orElseGet(() -> firstPlan(week));
        return new CheckInView(week.weekOf(), asked(week, plan, dataSays(account, week, plan)).stream().map(CheckInQuestions::describe).toList(),
                false);
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
        Week week = week(account);
        if (!weekOf.equals(week.weekOf()) || taken(account, weekOf)) {
            throw new ApiException(ErrorCode.CONFLICT);
        }
        Answers.Read answers;
        try {
            answers = Answers.read(answered);
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
        CheckIn dataSays = dataSays(account, week, plan);
        CheckIn checkIn = new CheckIn(dataSays.look(), answers.checkIn().training(), answers.checkIn().recovery(), dataSays.waist(),
                dataSays.adherence(), dataSays.appetite());
        Snapshot snapshot = snapshot(week, plan, checkIn, answers.menstrualLossReported());
        Decision decision = DecisionPipeline.decide(snapshot, week.parameters());
        CallStore.Call call = new CallStore.Call(UUID.randomUUID(), clientId, weekOf, week.today(), clock.instant(), parameters.versionHash(),
                StoredSnapshot.of(snapshot), DecisionJson.of(decision), application(decision));
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
        CheckIn.Waist waist = WaistTrend.direction(measurements.waists(account,
                today.minusDays(p.wholeNumber(ParameterKey.DECISION_WINDOW_DAYS) - 1L), today), p);
        CheckIn dataSays = new CheckIn(look, CheckIn.Training.UNKNOWN, CheckIn.Recovery.UNKNOWN, waist, Optional.empty(), CheckIn.Appetite.UNKNOWN);
        return new Week(profile, today, weekOf, sex, p, new Profile(age, profile.heightCm()), weights,
                dataSays);
    }

    /** One call a week (K-212): the same rule for offering the check-in and for taking its answers. */
    private boolean taken(AccountId account, LocalDate weekOf) {
        return CheckInWeek.taken(weekOf, calls.newestFirst(account, Optional.empty(), 1).stream().findFirst().map(CallStore.Call::weekOf));
    }

    private List<Answers.Kind> asked(Week week, CallStore.Plan plan, CheckIn dataSays) {
        return CheckInQuestions.needed(checkIn -> DecisionPipeline.decide(snapshot(week, plan, checkIn, false), week.parameters()),
                dataSays, budget.forWeek(CheckInQuestions.anomaly(dataSays, plan.phase())));
    }

    /** What the data says, with how the plan was followed over the window, counted from the logs (K-220). */
    private CheckIn dataSays(AccountId account, Week week, CallStore.Plan plan) {
        return logs.adherence(account, week.profile(), week.today(), plan, bodyweight(account, week), week.body().ageYears(), week.parameters())
                .map(week.dataSays()::withAdherence).orElse(week.dataSays());
    }

    // Today's trend weight, or the last weight known however old (K-216 review).
    private Optional<BigDecimal> bodyweight(AccountId account, Week week) {
        return WeightTrend.at(new WeightSeries(week.weights()), week.today(), week.parameters().wholeNumber(ParameterKey.TREND_DISPLAY_DAYS))
                .or(() -> measurements.latestWeightKg(account));
    }

    private Snapshot snapshot(Week week, CallStore.Plan plan, CheckIn checkIn, boolean menstrualLossReported) {
        if (plan.planStart().isAfter(week.today())) {
            // The plan began on a later date than today on the user's calendar now (a time zone moved west).
            throw new ApiException(ErrorCode.CONFLICT);
        }
        // The plan's target is what the calorie ladder moves (K-216); what training burns is not known yet.
        return new Snapshot(week.today(), week.sex(), plan.phase(), plan.planStart(), new WeightSeries(week.weights()), Optional.empty(),
                Optional.ofNullable(plan.targetKcal()).map(EnergyBudget::exerciseUnknown), menstrualLossReported, checkIn,
                Optional.of(week.body()), plan.observingMaintenance(), plan.phaseStart(), Optional.empty());
    }

    /**
     * The first plan: the direction the user chose, and the starting target — the maintenance estimate, watched before
     * it is judged (K-114). Without a weigh-in there is no estimate yet; the engine says there is not enough data.
     */
    private CallStore.Plan firstPlan(Week week) {
        Phase phase = switch (week.profile().goal()) {
            case LOSE_FAT -> Phase.CUT;
            case BUILD_MUSCLE -> Phase.BULK;
            // The phase gate needs the fat estimate (DURUM questions 11, 17): no direction is guessed.
            case DECIDE_FOR_ME -> throw new ApiException(ErrorCode.CONFLICT);
        };
        return new CallStore.Plan(phase, week.today(), week.today(), estimate(week), true, null);
    }

    /** The maintenance estimate at the last weigh-in of the window (K-114); none without one. */
    private Integer estimate(Week week) {
        return week.weights().isEmpty() ? null : InitialTarget.estimate(week.sex(), week.weights().getLast().kg(), week.body(),
                week.profile().activity().map(activity -> ActivityLevel.valueOf(activity.name())), week.parameters()).maintenanceKcal();
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

    /** Whether the call changes the plan (applied by K-216): a pause, "continue" or advice changes nothing. */
    static CallStore.Application application(Decision decision) {
        return switch (decision.action()) {
            case app.keel.engine.Action.NoDecisionYet _, app.keel.engine.Action.Continue _, app.keel.engine.Action.FixTraining _,
                 app.keel.engine.Action.FixRecovery _, app.keel.engine.Action.FixAdherence _ -> CallStore.Application.NOT_NEEDED;
            default -> CallStore.Application.PENDING;
        };
    }

    /**
     * Applies the current call (K-216): only the one thing it is about moves (U3), and the call keeps when and the plan
     * before and after. Applied twice, nothing more changes; a call that changes nothing, one undone, one not the latest,
     * or one whose kind is not applied here (training → K-217; phase, mini cut, hard stop → DURUM 11, 17, 18) is CONFLICT.
     */
    @Transactional
    PlanTargets apply(AccountId account, UUID id) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        CallStore.Call call = latest(account, id);
        if (call.application() == CallStore.Application.APPLIED) {
            return targetsAfter(account);
        }
        if (call.application() != CallStore.Application.PENDING) {
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
        CallStore.Plan after = (onTheProgram(account, id, action, week.today(), LocalDate.parse((String) call.decision().get("nextReview")))
                ? Optional.of(before) : PlanChange.after(before, action, week.today(), week.parameters()))
                .orElseThrow(() -> new ApiException(ErrorCode.CONFLICT));
        // Only the request that moved the call from PENDING changes the plan; another one at the same moment reads it.
        if (calls.markApplied(account, id, clock.instant(), before, after)) {
            calls.replace(account, after);
        }
        return targetsAfter(account);
    }

    /** Puts the plan back as it was before the call (kept in the audit trail). Undone twice, nothing more changes. */
    @Transactional
    PlanTargets undo(AccountId account, UUID id) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        CallStore.Call call = latest(account, id);
        if (call.application() == CallStore.Application.UNDONE) {
            return targetsAfter(account);
        }
        if (call.application() != CallStore.Application.APPLIED) {
            throw new ApiException(ErrorCode.CONFLICT);
        }
        if (calls.markUndone(account, id, clock.instant())) {
            calls.replace(account, call.planBefore());
            training.undo(account, id);
        }
        return targetsAfter(account);
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
        return Optional.of(PlanTargets.of(plan.get(), bodyweight, week.sex(), week.body().ageYears(), week.profile().trainingDays(), week.parameters())
                .orElseThrow(() -> new ApiException(ErrorCode.CONFLICT)));
    }

    /**
     * The targets after an apply or undo: without a calorie target yet (a training call on a plan that has none, K-217
     * review), what is known — the steps and the training days — rather than NOT_FOUND for a call that was applied.
     */
    private PlanTargets targetsAfter(AccountId account) {
        return targetsNow(account).orElseGet(() -> {
            Week week = week(account);
            return PlanTargets.withoutCalories(calls.plan(account).orElseThrow(() -> new ApiException(ErrorCode.CONFLICT)), week.profile().trainingDays(),
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

    List<CallStore.Call> page(AccountId account, Optional<UUID> before, int limit) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        Optional<CallStore.Call> cursor = before.map(id -> calls.byId(account, id).orElseThrow(() -> new ApiException(ErrorCode.VALIDATION_FAILED)));
        return calls.newestFirst(account, cursor, limit);
    }
}
