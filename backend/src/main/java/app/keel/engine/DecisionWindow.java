package app.keel.engine;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.OptionalInt;

/**
 * How many days the weekly calls read (K-1203, ADR-091 Ek 4). Normally decision_window_days (J1 D1). A cut still on its
 * starting estimate is the one exception: the maintenance observation (G2 K-8, at most maintenance_observation_days) is
 * itself two weeks of the scale at that calorie level, so when those days are over the call reads just them instead of
 * waiting for the longer window to fill. The first deficit then starts on the day after the observation, not a week or
 * more later. It applies only when that observation shows the weight confidently flat: a loss toward the goal of
 * observation_flat_fraction of the noise margin or more is ambiguous in two weeks (0.5 kg a week cannot be told from flat),
 * so such a cut keeps the normal window, as before (no extra deficit on top of a loss already under way). The shortening ends where the normal window would have been full, and it never applies to a bulk or to the
 * woman's 28 days (her observation is as long as her window, J1 D1).
 *
 * <p>K-1204 (ADR-091 Ek 4): outside the observation the window flexes with the data. It is the smallest whole number of weeks,
 * from the base window up to decision_window_max_weeks, in which every week has min_weighins_floor_per_week weigh-ins and
 * the noise margin of the two edge weeks ({@link NoiseMargin}), spread over the window's weekly steps, is no more than
 * detectable_rate_kg_per_week. Dense data gives the base window, as before.
 */
public final class DecisionWindow {

    private static final int DAYS_PER_WEEK = 7;

    private DecisionWindow() {
    }

    /** The days of the window the call reads on {@code today}. */
    public static int days(Phase phase, boolean observingMaintenance, LocalDate planStart, LocalDate today, WeightSeries weights,
            Parameters parameters) {
        boolean flat = confidentlyFlat(weights, today, parameters);
        if (observationIsTheWindow(phase, observingMaintenance, planStart, today, flat, parameters)) {
            return baseDays(phase, observingMaintenance, planStart, today, flat, parameters);
        }
        int base = baseDays(phase, observingMaintenance, planStart, today, flat, parameters) / DAYS_PER_WEEK;
        return DAYS_PER_WEEK * sufficientWeeks(base, planStart, today, weights, parameters).orElse(base);
    }

    /** The window before the data flexes it: the observation, or decision_window_days. */
    static int baseDays(Phase phase, boolean observingMaintenance, LocalDate planStart, LocalDate today, boolean flat, Parameters parameters) {
        return observationIsTheWindow(phase, observingMaintenance, planStart, today, flat, parameters)
                ? parameters.wholeNumber(ParameterKey.MAINTENANCE_OBSERVATION_DAYS) : parameters.wholeNumber(ParameterKey.DECISION_WINDOW_DAYS);
    }

    /**
     * The smallest window in whole weeks, from {@code baseWeeks} up to decision_window_max_weeks, that can carry a call on
     * {@code today}; empty when none can. It lies inside the plan, every week has a weigh-in, and the edge weeks' noise
     * margin per weekly step is under detectable_rate_kg_per_week.
     */
    static OptionalInt sufficientWeeks(int baseWeeks, LocalDate planStart, LocalDate today, WeightSeries weights, Parameters parameters) {
        int floor = parameters.wholeNumber(ParameterKey.MIN_WEIGHINS_FLOOR_PER_WEEK);
        BigDecimal detectable = BigDecimal.valueOf(parameters.number(ParameterKey.DETECTABLE_RATE_KG_PER_WEEK));
        int most = Math.max(baseWeeks, parameters.wholeNumber(ParameterKey.DECISION_WINDOW_MAX_WEEKS));
        for (int weeks = baseWeeks; weeks <= most; weeks++) {
            if (today.isBefore(planStart.plusDays((long) weeks * DAYS_PER_WEEK - 1L))) {
                return OptionalInt.empty(); // a longer window reaches further back than the plan
            }
            int[] counts = weekCounts(weights, today, weeks);
            if (java.util.Arrays.stream(counts).anyMatch(count -> count < floor)) {
                continue;
            }
            BigDecimal margin = NoiseMargin.of(counts[weeks - 1], counts[0], parameters);
            if (margin.compareTo(detectable.multiply(BigDecimal.valueOf(weeks - 1L))) <= 0) {
                return OptionalInt.of(weeks);
            }
        }
        return OptionalInt.empty();
    }

    /** Weigh-ins in each of the window's weeks, the latest first. */
    static int[] weekCounts(WeightSeries weights, LocalDate today, int weeks) {
        int[] counts = new int[weeks];
        for (int week = 0; week < weeks; week++) {
            LocalDate weekEnd = today.minusDays((long) week * DAYS_PER_WEEK);
            counts[week] = weights.countBetween(weekEnd.minusDays(DAYS_PER_WEEK - 1L), weekEnd);
        }
        return counts;
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
     * The first week's mean against the last's, over the observation: the change between the first and last week's mean, up or down, is under
     * observation_flat_fraction of flat_margin_kg either way (a gain beyond it is not flat either: the weight is not held). A week without weigh-ins has no mean to judge:
     * it counts as flat here so that DataSufficiency says what is missing.
     */
    static boolean confidentlyFlat(WeightSeries weights, LocalDate today, Parameters parameters) {
        int observationDays = parameters.wholeNumber(ParameterKey.MAINTENANCE_OBSERVATION_DAYS);
        List<WeeklySpine.WeekMean> weeks = WeeklySpine.windowMeans(weights, today, observationDays);
        if (weeks.stream().anyMatch(week -> week.kg().isEmpty())) {
            return true;
        }
        BigDecimal change = weeks.getFirst().kg().get().subtract(weeks.getLast().kg().get()).abs();
        BigDecimal limit = BigDecimal.valueOf(parameters.number(ParameterKey.FLAT_MARGIN_KG))
                .multiply(BigDecimal.valueOf(parameters.number(ParameterKey.OBSERVATION_FLAT_FRACTION)));
        return change.compareTo(limit) < 0;
    }

    static int days(Snapshot snapshot, Parameters parameters) {
        return days(snapshot.phase(), snapshot.observingMaintenance(), snapshot.planStart(), snapshot.today(), snapshot.weights(), parameters);
    }

    static boolean observationIsTheWindow(Snapshot snapshot, Parameters parameters) {
        return observationIsTheWindow(snapshot.phase(), snapshot.observingMaintenance(), snapshot.planStart(), snapshot.today(),
                snapshot.weights(), parameters);
    }
}
