package app.keel.engine;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * How many days the weekly calls read (K-1203, ADR-091 Ek 4). Normally decision_window_days (J1 D1). A cut still on its
 * starting estimate is the one exception: the maintenance observation (G2 K-8, at most maintenance_observation_days) is
 * itself two weeks of the scale at that calorie level, so when those days are over the call reads just them instead of
 * waiting for the longer window to fill. The first deficit then starts on the day after the observation, not a week or
 * more later. It applies only when that observation shows the weight confidently flat: a loss toward the goal of
 * observation_flat_fraction of the noise margin or more is ambiguous in two weeks (0.5 kg a week cannot be told from flat),
 * so such a cut keeps the normal window, as before (no extra deficit on top of a loss already under way). The shortening ends where the normal window would have been full, and it never applies to a bulk or to the
 * woman's 28 days (her observation is as long as her window, J1 D1).
 */
public final class DecisionWindow {

    private DecisionWindow() {
    }

    /** The days of the window the call reads on {@code today}. */
    public static int days(Phase phase, boolean observingMaintenance, LocalDate planStart, LocalDate today, WeightSeries weights,
            Parameters parameters) {
        return days(phase, observingMaintenance, planStart, today, confidentlyFlat(weights, today, parameters), parameters);
    }

    /** The same, with the weight's flatness already judged (a day to come is judged on the data there is today). */
    static int days(Phase phase, boolean observingMaintenance, LocalDate planStart, LocalDate today, boolean flat, Parameters parameters) {
        return observationIsTheWindow(phase, observingMaintenance, planStart, today, flat, parameters)
                ? parameters.wholeNumber(ParameterKey.MAINTENANCE_OBSERVATION_DAYS) : parameters.wholeNumber(ParameterKey.DECISION_WINDOW_DAYS);
    }

    /** Whether the window read today is the maintenance observation itself, shorter than the decision window. */
    public static boolean observationIsTheWindow(Phase phase, boolean observingMaintenance, LocalDate planStart, LocalDate today,
            WeightSeries weights, Parameters parameters) {
        return observationIsTheWindow(phase, observingMaintenance, planStart, today, confidentlyFlat(weights, today, parameters), parameters);
    }

    static boolean observationIsTheWindow(Phase phase, boolean observingMaintenance, LocalDate planStart, LocalDate today, boolean flat,
            Parameters parameters) {
        int window = parameters.wholeNumber(ParameterKey.DECISION_WINDOW_DAYS);
        int observation = parameters.wholeNumber(ParameterKey.MAINTENANCE_OBSERVATION_DAYS);
        return phase == Phase.CUT && observingMaintenance && observation < window && today.isBefore(planStart.plusDays(window - 1L)) && flat;
    }

    /**
     * The first week's mean against the last's, over the observation: the loss toward the goal is under
     * observation_flat_fraction of flat_margin_kg (a gain is under it too). A week without weigh-ins has no mean to judge:
     * it counts as flat here so that DataSufficiency says what is missing.
     */
    static boolean confidentlyFlat(WeightSeries weights, LocalDate today, Parameters parameters) {
        int observationDays = parameters.wholeNumber(ParameterKey.MAINTENANCE_OBSERVATION_DAYS);
        List<WeeklySpine.WeekMean> weeks = WeeklySpine.windowMeans(weights, today, observationDays);
        if (weeks.stream().anyMatch(week -> week.kg().isEmpty())) {
            return true;
        }
        BigDecimal loss = weeks.getFirst().kg().get().subtract(weeks.getLast().kg().get());
        BigDecimal limit = BigDecimal.valueOf(parameters.number(ParameterKey.FLAT_MARGIN_KG))
                .multiply(BigDecimal.valueOf(parameters.number(ParameterKey.OBSERVATION_FLAT_FRACTION)));
        return loss.compareTo(limit) < 0;
    }

    static int days(Snapshot snapshot, Parameters parameters) {
        return days(snapshot.phase(), snapshot.observingMaintenance(), snapshot.planStart(), snapshot.today(), snapshot.weights(), parameters);
    }

    static boolean observationIsTheWindow(Snapshot snapshot, Parameters parameters) {
        return observationIsTheWindow(snapshot.phase(), snapshot.observingMaintenance(), snapshot.planStart(), snapshot.today(),
                snapshot.weights(), parameters);
    }
}
