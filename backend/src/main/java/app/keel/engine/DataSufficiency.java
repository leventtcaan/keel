package app.keel.engine;

import java.time.LocalDate;
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

    private static final Source MEASUREMENT = new Source("arastirma/ham/H1-olcum.md#3.4", SourceTag.LITERATURE);
    private static final Source CYCLE_WINDOW = new Source("arastirma/ham/J1-cinsiyet.md#D1", SourceTag.LITERATURE);

    private static final int DAYS_PER_WEEK = 7;

    private DataSufficiency() {
    }

    /** A "no decision yet" if the data cannot carry a decision today; empty if the next rule may read it. */
    public static Optional<Decision> check(Snapshot snapshot, Parameters parameters) {
        LocalDate today = snapshot.today();
        WeightSeries weights = snapshot.weights();

        int noInterpretationDays = parameters.wholeNumber(ParameterKey.NO_INTERPRETATION_DAYS);
        Optional<LocalDate> first = weights.firstDay();
        if (first.isEmpty()) {
            return Optional.of(noDecisionYet(DATA_INSUFFICIENT, MEASUREMENT, today.plusDays(1)));
        }
        LocalDate interpretableFrom = first.get().plusDays(noInterpretationDays - 1L);
        if (today.isBefore(interpretableFrom)) {
            return Optional.of(noDecisionYet(DATA_INSUFFICIENT, MEASUREMENT, interpretableFrom));
        }

        int window = parameters.wholeNumber(ParameterKey.DECISION_WINDOW_DAYS);
        LocalDate windowFull = snapshot.planStart().plusDays(window - 1L);
        if (today.isBefore(windowFull)) {
            return Optional.of(noDecisionYet(WINDOW_NOT_FULL, CYCLE_WINDOW, windowFull));
        }

        int minPerWeek = parameters.wholeNumber(ParameterKey.MIN_WEIGHINS_PER_WEEK);
        // Whole weeks counted back from today; days of the window beyond the last whole week are not checked.
        for (int week = 0; week < window / DAYS_PER_WEEK; week++) {
            LocalDate weekEnd = today.minusDays((long) week * DAYS_PER_WEEK);
            LocalDate weekStart = weekEnd.minusDays(DAYS_PER_WEEK - 1L);
            if (weights.countBetween(weekStart, weekEnd) < minPerWeek) {
                // A week of regular weigh-ins from now fills the newest gap; older gaps age out of the window.
                return Optional.of(noDecisionYet(DATA_INSUFFICIENT, MEASUREMENT, today.plusDays(DAYS_PER_WEEK)));
            }
        }
        return Optional.empty();
    }

    private static Decision noDecisionYet(RuleId rule, Source source, LocalDate nextReview) {
        return new Decision(new Action.NoDecisionYet(), List.of(new Reason(rule, source)), Confidence.LOW,
                nextReview, new CopyKey("decision.no_decision_yet." + rule.value()));
    }
}
