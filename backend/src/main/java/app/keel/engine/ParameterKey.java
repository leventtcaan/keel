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
    WHTR_THRESHOLD(ParameterDomain.MEASUREMENT, "ratio"),
    WAIST_CM_ELEVATED(ParameterDomain.MEASUREMENT, "cm"),
    WAIST_MEASUREMENT_ERROR_CM(ParameterDomain.MEASUREMENT, "cm"),
    WEIGHT_DAILY_NOISE_SD_KG(ParameterDomain.MEASUREMENT, "kg"),
    PHOTO_MIN_DETECTABLE_FAT_MASS_KG(ParameterDomain.MEASUREMENT, "kg"),
    PHOTO_INTERVAL_WEEKS(ParameterDomain.MEASUREMENT, "weeks"),

    PROTEIN_G_PER_KG(ParameterDomain.NUTRITION, "g_per_kg_bodyweight"),
    PROTEIN_G_PER_KG_MAX(ParameterDomain.NUTRITION, "g_per_kg_bodyweight"),
    PROTEIN_G_PER_KG_FEMALE_45_PLUS(ParameterDomain.NUTRITION, "g_per_kg_bodyweight"),
    FAT_G_PER_KG_MIN(ParameterDomain.NUTRITION, "g_per_kg_bodyweight"),
    FAT_G_PER_KG_MAX(ParameterDomain.NUTRITION, "g_per_kg_bodyweight"),
    CARBS_MIN_G_PER_DAY(ParameterDomain.NUTRITION, "g_per_day"),
    FIBER_G_PER_DAY(ParameterDomain.NUTRITION, "g_per_day"),
    CUT_STEP_MIN_KCAL(ParameterDomain.NUTRITION, "kcal_per_day"),
    BULK_STEP_KCAL(ParameterDomain.NUTRITION, "kcal_per_day"),
    CALORIE_CHANGE_MIN_WAIT_WEEKS(ParameterDomain.NUTRITION, "weeks"),
    GAIN_RATE_IDEAL_KG_PER_MONTH(ParameterDomain.NUTRITION, "kg_per_month"),
    GAIN_RATE_MAX_KG_PER_MONTH(ParameterDomain.NUTRITION, "kg_per_month"),
    MAINTENANCE_OBSERVATION_DAYS(ParameterDomain.NUTRITION, "days"),

    WEEKLY_LOSS_CAP_KG(ParameterDomain.SAFETY, "kg_per_week"),
    WEEKLY_LOSS_CAP_PCT_BODYWEIGHT(ParameterDomain.SAFETY, "ratio"),
    BMR_FLOOR_ENABLED(ParameterDomain.SAFETY, "boolean"),
    RAPID_LOSS_HARD_STOP_PCT(ParameterDomain.SAFETY, "ratio"),
    RAPID_LOSS_WINDOW_WEEKS(ParameterDomain.SAFETY, "weeks"),
    LEA_THRESHOLD_KCAL_PER_KG_FFM(ParameterDomain.SAFETY, "kcal_per_kg_ffm_per_day"),
    EA_ADEQUATE_KCAL_PER_KG_FFM(ParameterDomain.SAFETY, "kcal_per_kg_ffm_per_day"),
    BULK_CEILING_FAT_PROXY_PCT(ParameterDomain.SAFETY, "percent_internal_only"),

    TARGET_RIR_MAX(ParameterDomain.TRAINING, "reps_in_reserve"),
    WEEKLY_SETS_PER_MUSCLE(ParameterDomain.TRAINING, "sets_per_week"),
    SETS_PER_SESSION_PER_MUSCLE_MIN(ParameterDomain.TRAINING, "sets"),
    SETS_PER_SESSION_PER_MUSCLE_MAX(ParameterDomain.TRAINING, "sets"),
    FREQUENCY_PER_MUSCLE_PER_WEEK(ParameterDomain.TRAINING, "sessions_per_week"),
    DEFAULT_TRAINING_DAYS_PER_WEEK(ParameterDomain.TRAINING, "days_per_week"),
    LOAD_INCREMENT_UPPER_KG(ParameterDomain.TRAINING, "kg"),
    LOAD_INCREMENT_LOWER_KG(ParameterDomain.TRAINING, "kg"),
    LOAD_PROGRESSION_COMPOUND_ONLY(ParameterDomain.TRAINING, "boolean"),
    TECHNIQUE_GATE_REQUIRED(ParameterDomain.TRAINING, "boolean"),
    STAGNATION_DELOAD_MONTHS(ParameterDomain.TRAINING, "months"),
    DELOAD_VOLUME_FACTOR(ParameterDomain.TRAINING, "ratio"),
    DELOAD_LOAD_REDUCTION_MIN(ParameterDomain.TRAINING, "ratio"),
    DELOAD_LOAD_REDUCTION_MAX(ParameterDomain.TRAINING, "ratio"),

    TREND_DISPLAY_DAYS(ParameterDomain.WINDOWS, "days"),
    DECISION_WINDOW_DAYS(ParameterDomain.WINDOWS, "days"),
    NO_INTERPRETATION_DAYS(ParameterDomain.WINDOWS, "days"),
    EVALUATION_WINDOW_DAYS(ParameterDomain.WINDOWS, "days");

    private final ParameterDomain domain;
    private final String unit;

    ParameterKey(ParameterDomain domain, String unit) {
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

    public String unit() {
        return unit;
    }
}
