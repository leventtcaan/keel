package app.keel.engine;

import java.util.Locale;

/**
 * Every parameter the engine reads, with the file it lives in and the unit the code assumes. Values are never
 * here (K2): they come from data/parameters/*.yaml through {@link ParameterSet}. Loading fails if the files and
 * this list disagree (unknown key, missing key, other unit), so a renamed key or a kg→lb change cannot slip in.
 *
 * <p>quota.yaml is not listed: quotas are product limits for the coach, not engine rules (U14).
 */
public enum ParameterKey {
    WHTR_THRESHOLD(ParameterDomain.MEASUREMENT, Unit.RATIO),
    WAIST_CM_ELEVATED(ParameterDomain.MEASUREMENT, Unit.CM),
    WAIST_MEASUREMENT_ERROR_CM(ParameterDomain.MEASUREMENT, Unit.CM),
    WEIGHT_DAILY_NOISE_SD_KG(ParameterDomain.MEASUREMENT, Unit.KG),
    PHOTO_MIN_DETECTABLE_FAT_MASS_KG(ParameterDomain.MEASUREMENT, Unit.KG),
    PHOTO_INTERVAL_WEEKS(ParameterDomain.MEASUREMENT, Unit.WEEKS),

    PROTEIN_G_PER_KG(ParameterDomain.NUTRITION, Unit.G_PER_KG_BODYWEIGHT),
    PROTEIN_G_PER_KG_MAX(ParameterDomain.NUTRITION, Unit.G_PER_KG_BODYWEIGHT),
    PROTEIN_G_PER_KG_FEMALE_45_PLUS(ParameterDomain.NUTRITION, Unit.G_PER_KG_BODYWEIGHT),
    PROTEIN_FEMALE_HIGHER_FROM_AGE(ParameterDomain.NUTRITION, Unit.YEARS),
    FAT_G_PER_KG_MIN(ParameterDomain.NUTRITION, Unit.G_PER_KG_BODYWEIGHT),
    FAT_G_PER_KG_MAX(ParameterDomain.NUTRITION, Unit.G_PER_KG_BODYWEIGHT),
    CARBS_MIN_G_PER_DAY(ParameterDomain.NUTRITION, Unit.G_PER_DAY),
    FIBER_G_PER_DAY(ParameterDomain.NUTRITION, Unit.G_PER_DAY),
    CUT_STEP_MIN_KCAL(ParameterDomain.NUTRITION, Unit.KCAL_PER_DAY),
    BULK_STEP_KCAL(ParameterDomain.NUTRITION, Unit.KCAL_PER_DAY),
    CALORIE_CHANGE_MIN_WAIT_WEEKS(ParameterDomain.NUTRITION, Unit.WEEKS),
    GAIN_RATE_IDEAL_KG_PER_MONTH(ParameterDomain.NUTRITION, Unit.KG_PER_MONTH),
    GAIN_RATE_MAX_KG_PER_MONTH(ParameterDomain.NUTRITION, Unit.KG_PER_MONTH),
    MAINTENANCE_OBSERVATION_DAYS(ParameterDomain.NUTRITION, Unit.DAYS),

    WEEKLY_LOSS_CAP_KG(ParameterDomain.SAFETY, Unit.KG_PER_WEEK),
    WEEKLY_LOSS_CAP_PCT_BODYWEIGHT(ParameterDomain.SAFETY, Unit.RATIO),
    BMR_FLOOR_ENABLED(ParameterDomain.SAFETY, Unit.BOOLEAN),
    RAPID_LOSS_HARD_STOP_PCT(ParameterDomain.SAFETY, Unit.RATIO),
    RAPID_LOSS_WINDOW_WEEKS(ParameterDomain.SAFETY, Unit.WEEKS),
    LEA_THRESHOLD_KCAL_PER_KG_FFM(ParameterDomain.SAFETY, Unit.KCAL_PER_KG_FFM_PER_DAY),
    EA_ADEQUATE_KCAL_PER_KG_FFM(ParameterDomain.SAFETY, Unit.KCAL_PER_KG_FFM_PER_DAY),
    BULK_CEILING_FAT_PROXY_PCT(ParameterDomain.SAFETY, Unit.PERCENT_INTERNAL_ONLY),
    FAT_FIRST_FAT_PROXY_PCT(ParameterDomain.SAFETY, Unit.PERCENT_INTERNAL_ONLY),
    SURPLUS_BELOW_FAT_PROXY_PCT(ParameterDomain.SAFETY, Unit.PERCENT_INTERNAL_ONLY),

    TARGET_RIR_MAX(ParameterDomain.TRAINING, Unit.REPS_IN_RESERVE),
    WEEKLY_SETS_PER_MUSCLE(ParameterDomain.TRAINING, Unit.SETS_PER_WEEK),
    SETS_PER_SESSION_PER_MUSCLE_MIN(ParameterDomain.TRAINING, Unit.SETS),
    SETS_PER_SESSION_PER_MUSCLE_MAX(ParameterDomain.TRAINING, Unit.SETS),
    FREQUENCY_PER_MUSCLE_PER_WEEK(ParameterDomain.TRAINING, Unit.SESSIONS_PER_WEEK),
    DEFAULT_TRAINING_DAYS_PER_WEEK(ParameterDomain.TRAINING, Unit.DAYS_PER_WEEK),
    LOAD_INCREMENT_UPPER_KG(ParameterDomain.TRAINING, Unit.KG),
    LOAD_INCREMENT_LOWER_KG(ParameterDomain.TRAINING, Unit.KG),
    LOAD_PROGRESSION_COMPOUND_ONLY(ParameterDomain.TRAINING, Unit.BOOLEAN),
    TECHNIQUE_GATE_REQUIRED(ParameterDomain.TRAINING, Unit.BOOLEAN),
    STAGNATION_DELOAD_MONTHS(ParameterDomain.TRAINING, Unit.MONTHS),
    DELOAD_VOLUME_FACTOR(ParameterDomain.TRAINING, Unit.RATIO),
    DELOAD_LOAD_REDUCTION_MIN(ParameterDomain.TRAINING, Unit.RATIO),
    DELOAD_LOAD_REDUCTION_MAX(ParameterDomain.TRAINING, Unit.RATIO),

    TREND_DISPLAY_DAYS(ParameterDomain.WINDOWS, Unit.DAYS),
    DECISION_WINDOW_DAYS(ParameterDomain.WINDOWS, Unit.DAYS),
    NO_INTERPRETATION_DAYS(ParameterDomain.WINDOWS, Unit.DAYS),
    EVALUATION_WINDOW_DAYS(ParameterDomain.WINDOWS, Unit.DAYS),
    MIN_WEIGHINS_PER_WEEK(ParameterDomain.WINDOWS, Unit.WEIGHINS_PER_WEEK);

    private final ParameterDomain domain;
    private final Unit unit;

    ParameterKey(ParameterDomain domain, Unit unit) {
        this.domain = domain;
        this.unit = unit;
    }

    /** The key as written in the YAML files, e.g. {@code decision_window_days}. */
    public String yamlKey() {
        return name().toLowerCase(Locale.ROOT);
    }

    public ParameterDomain domain() {
        return domain;
    }

    public Unit unit() {
        return unit;
    }
}
