package app.keel.decision;

import app.keel.engine.Consistency;
import app.keel.engine.ConsistencyRecord;
import app.keel.engine.ConsistencyWeek;
import app.keel.engine.FirstWeeks;
import app.keel.engine.MacroTargets;
import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import app.keel.engine.Sex;
import app.keel.engine.WeekTally;
import app.keel.engine.WeighIn;
import app.keel.measurement.Measurements;
import app.keel.nutrition.MealTotals;
import app.keel.profile.ProfileFacts;
import app.keel.shared.AccountId;
import app.keel.training.TrainingLog;
import app.keel.training.TrainingStatusReader;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.NavigableMap;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/**
 * The adherence the spine reads (K-220, ADR-020 L-6): the window's weeks tallied from the modules' logs — workouts
 * (training), weigh-ins and step counts (measurement), meals (nutrition) — never their tables.
 */
@Component
class WeekLogs {

    private static final int DAYS_PER_WEEK = 7;

    private final TrainingLog training;
    private final Measurements measurements;
    private final MealTotals meals;
    private final CallStore calls;
    private final StateStore states;
    private final PlannedSessions planned;
    private final TrainingStatusReader statuses;

    WeekLogs(TrainingLog training, Measurements measurements, MealTotals meals, CallStore calls, StateStore states, PlannedSessions planned,
            TrainingStatusReader statuses) {
        this.statuses = statuses;
        this.planned = planned;
        this.states = states;
        this.calls = calls;
        this.training = training;
        this.measurements = measurements;
        this.meals = meals;
    }

    /**
     * Done of planned over the decision window's weeks (its ratio the adherence, K-526); empty when nothing was planned in them. Protein days are judged
     * against the protein at {@code bodyweight}; without one they are not judged.
     */
    Optional<Consistency.WindowCount> adherence(AccountId account, ProfileFacts profile, LocalDate today, CallStore.Plan plan, Optional<BigDecimal> bodyweight,
            int ageYears, Parameters parameters) {
        List<LocalDate> weeks = WeekTallies.weeks(today, parameters.wholeNumber(ParameterKey.DECISION_WINDOW_DAYS), plan.phaseStart());
        if (weeks.isEmpty()) {
            return Optional.empty();
        }
        WeekTallies.Logs logs = logs(account, profile, weeks.getFirst(), weeks.getLast().plusWeeks(1).minusDays(1), bodyweight);
        // Weeks under a declared state and the ladder's weeks off are left out, as in consistency (K-516, K-1023, ADR-040 Ek 1); a window
        // left with nothing asked has no adherence.
        return WeekTallies.adherence(logs, restWeeks(account, paused(account,
                WeekTallies.of(weeks, logs, asked(account, profile, plan, bodyweight, ageYears, parameters)), today)));
    }

    /**
     * This week so far and the record since the first call (K-420), from the same logs and plan as the adherence; the
     * weeks over it was counted from, oldest first (K-513 reads the forgiven week from them), and the last of them cell by
     * cell for the grid (K-1016): the states of the walk that made the record, not a second count. This week, not yet
     * over, is in neither.
     */
    record Now(WeekTally week, ConsistencyRecord record, List<ConsistencyWeek> weeks, List<WeekTally> weeksOver) {
    }

    Now consistency(AccountId account, ProfileFacts profile, LocalDate today, CallStore.Plan plan, LocalDate firstCall,
            Optional<BigDecimal> bodyweight, int ageYears, Parameters parameters) {
        List<LocalDate> over = WeekTallies.since(firstCall, today);
        LocalDate monday = today.with(TemporalAdjusters.previousOrSame(Consistency.WEEK_STARTS_ON));
        WeekTallies.Logs logs = logs(account, profile, over.isEmpty() ? monday : over.getFirst(), today, bodyweight);
        WeekTallies.Plan asked = asked(account, profile, plan, bodyweight, ageYears, parameters);
        List<WeekTally> weeksOver = restWeeks(account, paused(account, WeekTallies.of(over, logs, asked), today));
        Consistency.Walked walked = Consistency.walked(weeksOver, parameters);
        WeekTally thisWeek = restWeeks(account, paused(account, List.of(WeekTallies.thisWeek(today, logs, asked)), today)).getFirst();
        return new Now(thisWeek, walked.record(), walked.weeks(), weeksOver);
    }

    /**
     * The user's own seven days from {@code from} (K-513): the days a session was done (two workouts on a day are its one
     * session, as in a week's tally), the days food was logged, and whether a state was declared on any of them.
     */
    FirstWeeks.UserWeek userWeek(AccountId account, ZoneId zone, LocalDate from) {
        LocalDate to = from.plusDays(DAYS_PER_WEEK - 1L);
        int sessions = (int) training.workoutStarts(account, from.atStartOfDay(zone).toInstant(), to.plusDays(1).atStartOfDay(zone).toInstant())
                .stream().map(started -> started.atZone(zone).toLocalDate()).distinct().count();
        return new FirstWeeks.UserWeek(sessions, loggedDays(account, from), !states.days(account, from, to).isEmpty());
    }

    /** The days with a session from {@code from} up to the day before {@code until}, on the user's calendar (K-962). */
    Set<LocalDate> sessionDays(AccountId account, ZoneId zone, LocalDate from, LocalDate until) {
        return training.workoutStarts(account, from.atStartOfDay(zone).toInstant(), until.atStartOfDay(zone).toInstant()).stream()
                .map(started -> started.atZone(zone).toLocalDate()).collect(Collectors.toSet());
    }

    /** The days food was logged in the seven from {@code from}. */
    int loggedDays(AccountId account, LocalDate from) {
        return meals.proteinByDay(account, from, from.plusDays(DAYS_PER_WEEK - 1L)).size();
    }

    /** The weeks with a day the user declared a state on, paused (K-516, ADR-038): neither on track nor missed. */
    private List<WeekTally> paused(AccountId account, List<WeekTally> weeks, LocalDate today) {
        if (weeks.isEmpty()) {
            return weeks;
        }
        return WeekTallies.pausedOn(weeks, states.days(account, weeks.getFirst().weekStart(), today));
    }

    /**
     * The weeks the deload ladder set a week off in, paused too (K-1022, ADR-040, K-435: a week of rest is part of the plan,
     * neither a success nor a miss; it splits no run and uses no spare week). Read from the applied changes, so a week off the
     * user undid is not one. A lighter week is still a week asked, and counts as it did. Read by the
     * consistency and by the call's adherence window alike (K-1023): one source for a planned rest.
     */
    private List<WeekTally> restWeeks(AccountId account, List<WeekTally> weeks) {
        if (weeks.isEmpty()) {
            return weeks;
        }
        LocalDate last = weeks.getLast().weekStart().plusDays(DAYS_PER_WEEK - 1L);
        return WeekTallies.pausedOn(weeks, statuses.breaks(account, weeks.getFirst().weekStart(), last).rest());
    }

    // The modules' logs from one day to another, on the user's calendar. Protein is judged only against a bodyweight.
    private WeekTallies.Logs logs(AccountId account, ProfileFacts profile, LocalDate from, LocalDate to, Optional<BigDecimal> bodyweight) {
        ZoneId zone = profile.timeZone();
        List<LocalDate> workoutDays = training.workoutStarts(account, from.atStartOfDay(zone).toInstant(), to.plusDays(1).atStartOfDay(zone).toInstant())
                .stream().map(started -> started.atZone(zone).toLocalDate()).toList();
        Map<LocalDate, WeekTallies.ProteinLogged> protein = bodyweight.isEmpty() ? Map.of() : meals.proteinByDay(account, from, to).entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, day -> new WeekTallies.ProteinLogged(day.getValue().lowG(), day.getValue().highG())));
        return new WeekTallies.Logs(workoutDays, measurements.dailyWeights(account, from, to).stream().map(WeighIn::date).collect(Collectors.toSet()),
                protein, measurements.stepsByDay(account, from, to));
    }

    private WeekTallies.Plan asked(AccountId account, ProfileFacts profile, CallStore.Plan plan, Optional<BigDecimal> bodyweight, int ageYears,
            Parameters parameters) {
        int proteinG = bodyweight.map(kg -> MacroTargets.proteinG(kg, Sex.valueOf(profile.sex().name()), ageYears, parameters)).orElse(0);
        return new WeekTallies.Plan(planned.byWeek(account, profile), parameters.wholeNumber(ParameterKey.MIN_WEIGHINS_PER_WEEK), proteinG,
                stepTargets(account, plan, profile.timeZone(), parameters));
    }

    /**
     * The step target of each day: a step day is judged against the target in force that day, not today's (K-220
     * review — else raising it would call the weeks before a miss). Changed only by applied calls; an undone one is as
     * if never applied.
     */
    Function<LocalDate, Integer> stepTargets(AccountId account, CallStore.Plan plan, ZoneId zone, Parameters parameters) {
        List<CallStore.Call> changes = calls.all(account).stream()
                .filter(call -> call.application() == CallStore.Application.APPLIED
                        && !Objects.equals(call.planBefore().stepsPerDay(), call.planAfter().stepsPerDay()))
                .sorted(Comparator.comparing(CallStore.Call::appliedAt)).toList();
        if (changes.isEmpty()) {
            int steps = PlanChange.steps(plan, parameters);
            return day -> steps;
        }
        NavigableMap<LocalDate, Integer> from = new TreeMap<>();
        changes.forEach(change -> from.put(change.appliedAt().atZone(zone).toLocalDate(), PlanChange.steps(change.planAfter(), parameters)));
        int before = PlanChange.steps(changes.getFirst().planBefore(), parameters);
        return day -> Optional.ofNullable(from.floorEntry(day)).map(Map.Entry::getValue).orElse(before);
    }
}
