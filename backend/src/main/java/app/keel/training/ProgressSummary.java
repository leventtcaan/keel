package app.keel.training;

import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import app.keel.shared.Decimals;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

/**
 * The progress and end-of-workout summaries (K-965; ADR-078 #2, #4; ADR-075 #7) — presentations of the log, not rules
 * (plan/yeni-yuz-kurallar.md › Kural olmayan sunumlar): facts the phone fills its en.json templates with, so it computes
 * nothing (ADR-075 #3). A session's set is its best (SessionTable.best); records are PersonalRecords'. No estimated max.
 */
final class ProgressSummary {

    private static final int SHARE_DECIMALS = 2;
    private static final int DAYS_PER_WEEK = 7;
    private static final BigDecimal PERCENT = BigDecimal.valueOf(100);

    /**
     * A primary muscle's week (ADR-078 #4, one map for the progress screen and the workout's end): the sets the program
     * plans and the working sets done, each as a share of its weekly target — weekly_sets_per_muscle (G1 K-11), or
     * arm_weekly_sets_min for an arm (G1 K-61) — capped at 1 and rounded down, so a muscle short of its target never
     * shows full.
     */
    record MuscleSets(String muscle, int plannedSets, int doneSets, int targetSets, BigDecimal plannedShare, BigDecimal doneShare) {
    }

    /** The effort line's kind (ADR-078 #2): "Stuck at 72.5 kg for 3 sessions." · "Same 100 kg, now with 1 rep left." · reps up at a load. */
    enum EffortKind { STUCK, EASIER, REPS_RISING }

    /**
     * The facts of one effort line; each kind has its own, the others absent. STUCK: {@code loadKg}, {@code sessions}
     * stalled, {@code held} (the weekly call holds the load). EASIER: {@code loadKg}, {@code reps}, {@code repsLeft} now
     * and {@code repsLeftBefore} last session. REPS_RISING: {@code loadKg}, {@code repsGained} {@code since} the first
     * session at the load, over {@code sessions} sessions and {@code weeks} whole weeks.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record EffortLine(EffortKind kind, BigDecimal loadKg, Integer reps, Integer sessions, Boolean held, Integer repsLeft, Integer repsLeftBefore,
            Integer repsGained, LocalDate since, Integer weeks) {
    }

    /** A workout of a move: its day on the user's calendar and its best set. */
    record Session(LocalDate day, TrainingLog.WorkSet top) {
    }

    /** A week's best set of a move (the strength chart), and whether the weekly call held the load that week. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record WeekBest(LocalDate weekOf, BigDecimal loadKg, int reps, Integer rir, boolean held) {
    }

    private ProgressSummary() {
    }

    /** Every muscle planned or trained, alphabetical; {@code planned} and {@code done} sets by primary muscle. */
    static List<MuscleSets> muscles(Map<String, Integer> planned, Map<String, Integer> done, Set<String> armMuscles, Parameters parameters) {
        Set<String> muscles = new TreeSet<>(planned.keySet());
        muscles.addAll(done.keySet());
        return muscles.stream().map(muscle -> {
            int target = parameters.wholeNumber(armMuscles.contains(muscle) ? ParameterKey.ARM_WEEKLY_SETS_MIN : ParameterKey.WEEKLY_SETS_PER_MUSCLE);
            int plannedSets = planned.getOrDefault(muscle, 0);
            int doneSets = done.getOrDefault(muscle, 0);
            return new MuscleSets(muscle, plannedSets, doneSets, target, share(plannedSets, target), share(doneSets, target));
        }).toList();
    }

    /** One session per workout, oldest first: its best set (sets of no reps are none). */
    static List<Session> sessions(List<TrainingLog.WorkSet> history, ZoneId zone) {
        return history.stream().collect(Collectors.groupingBy(TrainingLog.WorkSet::at, LinkedHashMap::new, Collectors.toList())).entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .flatMap(workout -> SessionTable.best(workout.getValue()).map(top -> new Session(day(workout.getKey(), zone), top)).stream())
                .toList();
    }

    /**
     * The working sets a workout counts, by move (the muscle map and the summary's set count): a two-sided move's sets as
     * logged; a one-sided move's once per set, as the side that did less — each side is its own set (SetRules) and the
     * weaker side decides the move's target (SessionProgress, NextTargets.weaker), so the program's sets are per side.
     */
    static Map<String, Integer> counted(List<TrainingLog.WorkSet> workout) {
        Map<String, Integer> counted = new LinkedHashMap<>();
        workout.stream().filter(set -> set.reps() >= 1)
                .collect(Collectors.groupingBy(TrainingLog.WorkSet::exerciseId, LinkedHashMap::new,
                        Collectors.groupingBy(set -> set.side() == Side.LEFT || set.side() == Side.RIGHT ? set.side() : Side.BOTH, Collectors.counting())))
                .forEach((move, sides) -> counted.put(move, sides.values().stream().mapToInt(Long::intValue).min().orElseThrow()));
        return counted;
    }

    /**
     * The move's effort line, the first kind that holds, in this order: STUCK — {@code stalled} sessions as the weekly call
     * counts them (TrainingStatusReader: the working sets logged in the app since the program was made, H3 B5) reach
     * plateau_sessions, so the line agrees with the call; EASIER — the last session the same load and reps as the one
     * before, with more reps left (both logged); REPS_RISING — the last sessions at one load, more reps now than at the
     * first of them. EASIER and REPS_RISING read the whole history shown, imported sessions too. None when nothing holds.
     */
    static Optional<EffortLine> effort(List<Session> sessions, int stalled, boolean held, Parameters parameters) {
        if (sessions.size() < 2) {
            return Optional.empty();
        }
        TrainingLog.WorkSet last = sessions.getLast().top();
        if (stalled >= parameters.wholeNumber(ParameterKey.PLATEAU_SESSIONS)) {
            return Optional.of(new EffortLine(EffortKind.STUCK, last.loadKg(), null, stalled, held, null, null, null, null, null));
        }
        TrainingLog.WorkSet before = sessions.get(sessions.size() - 2).top();
        if (last.loadKg().compareTo(before.loadKg()) == 0 && last.reps() == before.reps() && last.rir() != null && before.rir() != null
                && last.rir() > before.rir()) {
            return Optional.of(new EffortLine(EffortKind.EASIER, last.loadKg(), last.reps(), null, null, last.rir(), before.rir(), null, null, null));
        }
        int first = sessions.size() - 1;
        while (first > 0 && sessions.get(first - 1).top().loadKg().compareTo(last.loadKg()) == 0) {
            first--;
        }
        Session since = sessions.get(first);
        int gained = last.reps() - since.top().reps();
        if (gained > 0) {
            return Optional.of(new EffortLine(EffortKind.REPS_RISING, last.loadKg(), null, sessions.size() - first, null, null, null, gained,
                    since.day(), (int) ChronoUnit.WEEKS.between(since.day(), sessions.getLast().day())));
        }
        return Optional.empty();
    }

    /**
     * Each Monday week's best set, oldest first; held when a hold of the load (K-217) was in force on a day of it — only
     * for a {@code compound} move, the only kind the engine adds load to (G6 K-33).
     */
    static List<WeekBest> weeks(List<Session> sessions, List<TrainingChanges.Change> changes, boolean compound) {
        return sessions.stream().collect(Collectors.groupingBy(session -> monday(session.day()), LinkedHashMap::new, Collectors.toList()))
                .entrySet().stream().map(week -> {
                    TrainingLog.WorkSet top = SessionTable.best(week.getValue().stream().map(Session::top).toList()).orElseThrow();
                    LocalDate sunday = week.getKey().plusDays(DAYS_PER_WEEK - 1L);
                    boolean held = compound && changes.stream().anyMatch(change -> change.kind() == TrainingChanges.Kind.HOLD_LOAD
                            && !change.startsOn().isAfter(sunday) && (change.endsOn() == null || !change.endsOn().isBefore(week.getKey())));
                    return new WeekBest(week.getKey(), top.loadKg(), top.reps(), top.rir(), held);
                }).toList();
    }

    /** The weight lifted (ADR-075 #7): load × reps over the working sets, the load as logged. */
    static BigDecimal lifted(List<TrainingLog.WorkSet> sets) {
        return Decimals.plain(sets.stream().map(set -> set.loadKg().multiply(BigDecimal.valueOf(set.reps()))).reduce(BigDecimal.ZERO, BigDecimal::add));
    }

    /** The weight lifted against the last session of the same day, in whole percent; none without one that lifted any. */
    static Optional<Integer> changePercent(BigDecimal now, Optional<BigDecimal> before) {
        return before.filter(kg -> kg.signum() > 0)
                .map(kg -> now.subtract(kg).multiply(PERCENT).divide(kg, 0, RoundingMode.HALF_UP).intValueExact());
    }

    /** A session's active time (K-998): its length less the time paused, in whole minutes rounded half up. */
    static int activeMinutes(Instant startedAt, Instant endedAt, int pausedSeconds) {
        long active = Math.max(0, java.time.Duration.between(startedAt, endedAt).toSeconds() - pausedSeconds);
        return BigDecimal.valueOf(active).divide(BigDecimal.valueOf(java.time.Duration.ofMinutes(1).toSeconds()), 0, RoundingMode.HALF_UP)
                .intValueExact();
    }

    static LocalDate monday(LocalDate day) {
        return day.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    private static LocalDate day(Instant at, ZoneId zone) {
        return at.atZone(zone).toLocalDate();
    }

    private static BigDecimal share(int sets, int target) {
        return BigDecimal.valueOf(Math.min(sets, target)).divide(BigDecimal.valueOf(target), SHARE_DECIMALS, RoundingMode.DOWN);
    }
}
