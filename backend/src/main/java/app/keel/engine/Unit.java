package app.keel.engine;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Optional;

/**
 * The units parameters are written in, and what each one allows. These limits are what the unit means (a ratio is
 * at most 1, a window counts whole days), not tunable thresholds, so they belong in code (K2 covers thresholds).
 * They stop a value with the right type but the wrong meaning: 8 written for 8 % as a ratio would be 800 %.
 */
public enum Unit {
    BOOLEAN("boolean", Kind.FLAG, Bound.NONE),

    RATIO("ratio", Kind.FRACTION, Bound.UP_TO_ONE),
    PERCENT_INTERNAL_ONLY("percent_internal_only", Kind.FRACTION, Bound.UP_TO_HUNDRED),

    KG("kg", Kind.FRACTION, Bound.POSITIVE),
    CM("cm", Kind.FRACTION, Bound.POSITIVE),
    KG_PER_WEEK("kg_per_week", Kind.FRACTION, Bound.POSITIVE),
    KG_PER_MONTH("kg_per_month", Kind.FRACTION, Bound.POSITIVE),
    G_PER_KG_BODYWEIGHT("g_per_kg_bodyweight", Kind.FRACTION, Bound.POSITIVE),
    G_PER_DAY("g_per_day", Kind.FRACTION, Bound.POSITIVE),
    KCAL_PER_KG_FFM_PER_DAY("kcal_per_kg_ffm_per_day", Kind.FRACTION, Bound.POSITIVE),

    // Calorie targets and steps are whole kcal (coaching experience: 500, 250).
    KCAL_PER_DAY("kcal_per_day", Kind.WHOLE, Bound.POSITIVE),
    // Resting-energy formula terms (Mifflin-St Jeor, H6 A1). The constant can be negative (women: -161).
    KCAL_PER_KG_PER_DAY("kcal_per_kg_per_day", Kind.FRACTION, Bound.POSITIVE),
    KCAL_PER_CM_PER_DAY("kcal_per_cm_per_day", Kind.FRACTION, Bound.POSITIVE),
    KCAL_PER_YEAR_PER_DAY("kcal_per_year_per_day", Kind.FRACTION, Bound.POSITIVE),
    KCAL_OFFSET_PER_DAY("kcal_offset_per_day", Kind.WHOLE, Bound.NONE),
    // Energy in a kilogram of body-weight change (Hall 2008 via H6 A4).
    KCAL_PER_KG_WEIGHT_CHANGE("kcal_per_kg_weight_change", Kind.WHOLE, Bound.POSITIVE),
    WINDOWS("windows", Kind.WHOLE, Bound.POSITIVE),
    // Total over resting expenditure (PAL); a person always spends at least their resting energy, so never under 1.
    ACTIVITY_FACTOR("activity_factor", Kind.FRACTION, Bound.AT_LEAST_ONE),
    // How many of the engine's load steps a gym's next load may be over the last (K-430); at least one step.
    LOAD_STEPS("load_steps", Kind.FRACTION, Bound.AT_LEAST_ONE),
    // Multiples of flat_margin_kg (K-610's example week); at least one, or the example would sit inside the noise.
    MARGINS("margins", Kind.FRACTION, Bound.AT_LEAST_ONE),
    DAYS("days", Kind.WHOLE, Bound.POSITIVE),
    WEEKS("weeks", Kind.WHOLE, Bound.POSITIVE),
    MONTHS("months", Kind.WHOLE, Bound.POSITIVE),
    YEARS("years", Kind.WHOLE, Bound.POSITIVE),
    SETS("sets", Kind.WHOLE, Bound.POSITIVE),
    SESSIONS("sessions", Kind.WHOLE, Bound.POSITIVE),
    WEIGHINS_PER_WEEK("weighins_per_week", Kind.WHOLE, Bound.POSITIVE),
    SETS_PER_WEEK("sets_per_week", Kind.WHOLE, Bound.POSITIVE),
    SESSIONS_PER_WEEK("sessions_per_week", Kind.WHOLE, Bound.POSITIVE),
    DAYS_PER_WEEK("days_per_week", Kind.WHOLE, Bound.POSITIVE),
    // 0 is a real target here: a set taken to failure.
    REPS_IN_RESERVE("reps_in_reserve", Kind.WHOLE, Bound.ZERO_OR_MORE),
    // A count of repetitions (e1RM formula terms, H3 B15).
    REPS("reps", Kind.WHOLE, Bound.POSITIVE),
    // The daily step target (G2 K-42).
    STEPS_PER_DAY("steps_per_day", Kind.WHOLE, Bound.POSITIVE),
    // How many reference looks the user picks from (K-224).
    LEVELS("levels", Kind.WHOLE, Bound.POSITIVE),

    // The projection's energy balance model (Hall 2011, H12 M2-M5): published constants in the model's own units.
    MJ_PER_KG("mj_per_kg", Kind.FRACTION, Bound.POSITIVE),
    KJ_PER_KG("kj_per_kg", Kind.FRACTION, Bound.POSITIVE),
    KJ_PER_KG_PER_DAY("kj_per_kg_per_day", Kind.FRACTION, Bound.POSITIVE),
    // Grams of water stored with a gram of glycogen (more than 1, so not a ratio).
    G_PER_G("g_per_g", Kind.FRACTION, Bound.POSITIVE),
    MG_PER_ML("mg_per_ml", Kind.FRACTION, Bound.POSITIVE),
    MG_PER_L_PER_DAY("mg_per_l_per_day", Kind.FRACTION, Bound.POSITIVE),
    MG_PER_DAY("mg_per_day", Kind.FRACTION, Bound.POSITIVE),
    KJ_PER_DAY("kj_per_day", Kind.FRACTION, Bound.POSITIVE),
    // Body mass index (the projection's gates, K-613).
    KG_PER_M2("kg_per_m2", Kind.FRACTION, Bound.POSITIVE),
    // Terms of the starting body fat regression (Jackson 2002): inside the model only, never shown (U4). The constant
    // term is negative.
    PERCENT_PER_YEAR_INTERNAL_ONLY("percent_per_year_internal_only", Kind.FRACTION, Bound.POSITIVE),
    PERCENT_PER_LN_BMI_INTERNAL_ONLY("percent_per_ln_bmi_internal_only", Kind.FRACTION, Bound.POSITIVE),
    PERCENT_OFFSET_INTERNAL_ONLY("percent_offset_internal_only", Kind.FRACTION, Bound.NONE);

    /** What a value in this unit is. */
    public enum Kind {
        FLAG,
        WHOLE,
        FRACTION
    }

    private enum Bound {
        NONE,
        POSITIVE,
        ZERO_OR_MORE,
        UP_TO_ONE,
        UP_TO_HUNDRED,
        AT_LEAST_ONE
    }

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final String yamlName;
    private final Kind kind;
    private final Bound bound;

    Unit(String yamlName, Kind kind, Bound bound) {
        this.yamlName = yamlName;
        this.kind = kind;
        this.bound = bound;
    }

    public static Optional<Unit> fromYaml(String name) {
        return Arrays.stream(values()).filter(unit -> unit.yamlName.equals(name)).findFirst();
    }

    public String yamlName() {
        return yamlName;
    }

    public Kind kind() {
        return kind;
    }

    /** Why a number is not allowed in this unit, or empty if it is. */
    Optional<String> rejects(BigDecimal value) {
        boolean ok = switch (bound) {
            case NONE -> true;
            case POSITIVE -> value.signum() > 0;
            case ZERO_OR_MORE -> value.signum() >= 0;
            case UP_TO_ONE -> value.signum() > 0 && value.compareTo(BigDecimal.ONE) <= 0;
            case UP_TO_HUNDRED -> value.signum() > 0 && value.compareTo(HUNDRED) <= 0;
            case AT_LEAST_ONE -> value.compareTo(BigDecimal.ONE) >= 0;
        };
        if (ok) {
            return Optional.empty();
        }
        return Optional.of(switch (bound) {
            case POSITIVE -> "must be greater than 0";
            case ZERO_OR_MORE -> "must be 0 or more";
            case UP_TO_ONE -> "must be between 0 and 1 (a ratio: 0.08 means 8 %)";
            case UP_TO_HUNDRED -> "must be between 0 and 100 (a percent)";
            case AT_LEAST_ONE -> "must be 1 or more (total over resting expenditure)";
            case NONE -> throw new IllegalStateException("unreachable");
        });
    }
}
