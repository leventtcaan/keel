package app.keel.engine;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * The starting calorie estimate and the maintenance observation that replaces it (K-114, ADR-020 L-7).
 *
 * <ul>
 *   <li><b>Resting energy</b>: Mifflin-St Jeor, the simplified form (H6 A1): resting_kcal_per_kg × kg +
 *       resting_kcal_per_cm × cm − resting_kcal_per_year × age + resting_kcal_offset (men +5, women −161). The most
 *       reliable equation in the systematic review (H6 A2), though in people who train it misses about half the time.
 *       It is also the BMR the calorie floor uses (Güray G2 K-11 takes an online calculator's value).</li>
 *   <li><b>Maintenance</b>: resting × the activity factor (NASEM 2023 values, H6 A3); unknown activity uses
 *       activity_factor_unknown. Shown as a range of ± maintenance_estimate_error (U5, H6 A4).</li>
 *   <li><b>Observation</b>: the estimate is only a start. It holds for maintenance_observation_days (men 14, women 28)
 *       while the scale shows what maintenance really is — observation beats the formula (G2 K-8).</li>
 * </ul>
 *
 * <p>Güray starts from the last 2-3 months of eating (G2 K-9) rather than a formula; ADR-020 L-7 chose the formula,
 * because declared intake is under-counted (G2 K-13, NASEM 2023) and observation corrects the start either way.
 */
public final class InitialTarget {

    static final RuleId OBSERVING = new RuleId("observing");
    private static final Source OBSERVATION = new Source("arastirma/ham/guray/G2-kilo-verme.md#K-8", SourceTag.EXPERIENCE);

    private InitialTarget() {
    }

    /** A maintenance estimate as a range (U5), with the single number the plan starts from. */
    public record Estimate(int restingKcal, int maintenanceKcal, int lowKcal, int highKcal) {
    }

    /** Resting energy, whole kcal a day. */
    public static int restingKcal(Sex sex, BigDecimal weightKg, Profile profile, Parameters parameters) {
        return whole(resting(sex, weightKg, profile, parameters));
    }

    public static Estimate estimate(Sex sex, BigDecimal weightKg, Profile profile, Optional<ActivityLevel> activity,
            Parameters parameters) {
        requireSameSex(sex, parameters);
        BigDecimal resting = resting(sex, weightKg, profile, parameters);
        BigDecimal maintenance = resting.multiply(number(activityFactor(activity), parameters));
        BigDecimal error = number(ParameterKey.MAINTENANCE_ESTIMATE_ERROR, parameters);
        return new Estimate(whole(resting), whole(maintenance), whole(maintenance.multiply(BigDecimal.ONE.subtract(error))),
                whole(maintenance.multiply(BigDecimal.ONE.add(error))));
    }

    /**
     * "Not yet: watching what maintenance really is" while the starting estimate is being observed; empty once the
     * last observation day is reached or when the current target is not the starting estimate.
     */
    public static Optional<Decision> observing(Snapshot snapshot, Parameters parameters) {
        if (!snapshot.observingMaintenance()) {
            return Optional.empty();
        }
        LocalDate lastDay = snapshot.planStart().plusDays(parameters.wholeNumber(ParameterKey.MAINTENANCE_OBSERVATION_DAYS) - 1L);
        if (!snapshot.today().isBefore(lastDay)) {
            return Optional.empty();
        }
        return Optional.of(new Decision(new Action.NoDecisionYet(), List.of(new Reason(OBSERVING, OBSERVATION)), Confidence.LOW,
                lastDay, new CopyKey("decision.no_decision_yet.observing")));
    }

    private static BigDecimal resting(Sex sex, BigDecimal weightKg, Profile profile, Parameters parameters) {
        requireSameSex(sex, parameters);
        return weightKg.multiply(number(ParameterKey.RESTING_KCAL_PER_KG, parameters))
                .add(BigDecimal.valueOf(profile.heightCm()).multiply(number(ParameterKey.RESTING_KCAL_PER_CM, parameters)))
                .subtract(BigDecimal.valueOf(profile.ageYears()).multiply(number(ParameterKey.RESTING_KCAL_PER_YEAR, parameters)))
                .add(BigDecimal.valueOf(parameters.wholeNumber(ParameterKey.RESTING_KCAL_OFFSET)));
    }

    private static ParameterKey activityFactor(Optional<ActivityLevel> activity) {
        return activity.map(level -> switch (level) {
            case INACTIVE -> ParameterKey.ACTIVITY_FACTOR_INACTIVE;
            case LOW_ACTIVE -> ParameterKey.ACTIVITY_FACTOR_LOW_ACTIVE;
            case ACTIVE -> ParameterKey.ACTIVITY_FACTOR_ACTIVE;
            case VERY_ACTIVE -> ParameterKey.ACTIVITY_FACTOR_VERY_ACTIVE;
        }).orElse(ParameterKey.ACTIVITY_FACTOR_UNKNOWN);
    }

    // The offset differs by sex; a woman's estimate made with the male constant would be 166 kcal too high.
    private static void requireSameSex(Sex sex, Parameters parameters) {
        if (sex != parameters.sex()) {
            throw new IllegalArgumentException(sex + " estimate read with " + parameters.sex() + " parameters");
        }
    }

    private static BigDecimal number(ParameterKey key, Parameters parameters) {
        return BigDecimal.valueOf(parameters.number(key));
    }

    // Rounded once, at the end, half up: every intermediate value stays exact.
    private static int whole(BigDecimal kcal) {
        return kcal.setScale(0, RoundingMode.HALF_UP).intValueExact();
    }
}
