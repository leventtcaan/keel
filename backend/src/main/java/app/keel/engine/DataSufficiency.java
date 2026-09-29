package app.keel.engine;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * "Measure often, interpret rarely" (U8): before any rule reads the weight trend, check there is enough of it.
 * If not, the answer is a first-class "no decision yet" (U3) with the day it is worth looking again.
 *
 * <p>Order: (1) the first {@code no_interpretation_days} of data are never interpreted (H1 §3.4) — counted from the
 * first weigh-in, so imported history counts (ADR-018); (2) a plan is judged only after its full
 * {@code decision_window_days} (J1 D1: 28 days for women cancels the cycle); (3) every week of that window needs
 * {@code min_weighins_per_week}, or the two weeks being compared are mostly noise.
 */
public final class DataSufficiency {

    static final RuleId DATA_INSUFFICIENT = new RuleId("data_insufficient");
    static final RuleId WINDOW_NOT_FULL = new RuleId("window_not_full");
    static final List<RuleId> RULES = List.of(DATA_INSUFFICIENT, WINDOW_NOT_FULL);

    private static final Source MEASUREMENT = new Source("arastirma/ham/H1-olcum.md#3.4", SourceTag.LITERATURE);
    private static final Source CYCLE_WINDOW = new Source("arastirma/ham/J1-cinsiyet.md#D1", SourceTag.LITERATURE);

    private static final int DAYS_PER_WEEK = 7;

    private DataSufficiency() {
    }

    /** A "no decision yet" if the data cannot carry a decision today; empty if the next rule may read it. */
    public static Optional<Decision> check(Snapshot snapshot, Parameters parameters) {
        return firstGap(snapshot, parameters).map(gap -> new Decision(new Action.NoDecisionYet(),
                List.of(new Reason(gap.rule(), gap.source())), Confidence.LOW,
                earliestEnoughDay(snapshot, parameters),
                new CopyKey("decision.no_decision_yet." + gap.rule().value())));
    }

    private record Gap(RuleId rule, Source source) {
    }

    /** The first of the three checks that fails today, in order; empty if all pass. */
    private static Optional<Gap> firstGap(Snapshot snapshot, Parameters parameters) {
        LocalDate today = snapshot.today();
        WeightSeries weights = snapshot.weights();

        int noInterpretationDays = parameters.wholeNumber(ParameterKey.NO_INTERPRETATION_DAYS);
        Optional<LocalDate> first = weights.firstDay();
        if (first.isEmpty() || today.isBefore(first.get().plusDays(noInterpretationDays - 1L))) {
            return Optional.of(new Gap(DATA_INSUFFICIENT, MEASUREMENT));
        }

        int window = parameters.wholeNumber(ParameterKey.DECISION_WINDOW_DAYS);
        if (today.isBefore(snapshot.planStart().plusDays(window - 1L))) {
            return Optional.of(new Gap(WINDOW_NOT_FULL, CYCLE_WINDOW));
        }

        int minPerWeek = parameters.wholeNumber(ParameterKey.MIN_WEIGHINS_PER_WEEK);
        // Whole weeks counted back from today; days of the window beyond the last whole week are not checked.
        for (int week = 0; week < window / DAYS_PER_WEEK; week++) {
            LocalDate weekEnd = today.minusDays((long) week * DAYS_PER_WEEK);
            if (weights.countBetween(weekEnd.minusDays(DAYS_PER_WEEK - 1L), weekEnd) < minPerWeek) {
                return Optional.of(new Gap(DATA_INSUFFICIENT, MEASUREMENT));
            }
        }
        return Optional.empty();
    }

    /**
     * The review date promised to the user: the first day from which all three checks pass, on that day and every
     * later one, if they weigh in every morning from tomorrow. "From which", not "on which": weeks are counted back
     * from the day looked at, so a thin week can pass on a Thursday, when it is split across two weeks, and fail
     * again at the next weekly check-in, when it is whole. Found by trying each day in turn rather than by a formula,
     * so it stays right when the checks interact. The search is bounded: from the longer of the two periods on, the
     * window holds only the daily weigh-ins, and every check stays passed.
     */
    private static LocalDate earliestEnoughDay(Snapshot snapshot, Parameters parameters) {
        int horizon = Math.max(parameters.wholeNumber(ParameterKey.NO_INTERPRETATION_DAYS),
                parameters.wholeNumber(ParameterKey.DECISION_WINDOW_DAYS));
        List<WeighIn> weighIns = new ArrayList<>(snapshot.weights().weighIns());
        BigDecimal lastKg = weighIns.isEmpty() ? BigDecimal.ONE : weighIns.getLast().kg();
        LocalDate lastShort = snapshot.today();
        for (int ahead = 1; ahead <= horizon; ahead++) {
            LocalDate day = snapshot.today().plusDays(ahead);
            // Only the dates matter to these checks; the weight value is a placeholder.
            weighIns.add(new WeighIn(day, lastKg));
            Snapshot then = new Snapshot(day, snapshot.sex(), snapshot.phase(), snapshot.planStart(), new WeightSeries(weighIns));
            if (firstGap(then, parameters).isPresent()) {
                lastShort = day;
            }
        }
        if (lastShort.equals(snapshot.today().plusDays(horizon))) {
            throw new IllegalStateException("No day within " + horizon + " days makes the data sufficient");
        }
        return lastShort.plusDays(1);
    }

}
