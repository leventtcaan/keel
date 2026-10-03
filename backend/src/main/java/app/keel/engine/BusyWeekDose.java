package app.keel.engine;

/**
 * The least that keeps strength and muscle through a busy week (K-524, ADR-038 #7; H9 §2): {@code sessions} in the week,
 * {@code setsPerExercise} of each of the day's exercises, the load kept ({@code keepLoad}: intensity is what maintains,
 * Spiering 2021). One session of one set under busy_min_older_age (Bickel 2011's 1/9 dose: strength and muscle kept 32
 * weeks at 20-35; once a week held strength in professionals, Rønnestad 2011); from it, more (the same dose kept strength
 * but not muscle size at 60-75; Spiering 2021, low confidence). Not a must: two weeks off lose no 1RM in trained young
 * men (H9 §1.1-1.2) — it is what the week can still hold.
 *
 * <p>The return load after a break is not a rule here: no study gives the first session's share of the last load (H9 §5,
 * ADR-038 #7).
 */
public record BusyWeekDose(int sessions, int setsPerExercise, boolean keepLoad) {

    static final RuleId BUSY_MINIMUM_DOSE = new RuleId("busy_minimum_dose");
    static final Reason REASON = new Reason(BUSY_MINIMUM_DOSE, new Source("arastirma/ham/H9-donus-minimum-doz.md#§2.1", SourceTag.LITERATURE));

    public BusyWeekDose {
        if (sessions < 1 || setsPerExercise < 1) {
            throw new IllegalArgumentException("a dose is at least one session of one set");
        }
    }

    public static BusyWeekDose of(int ageYears, Parameters parameters) {
        boolean older = ageYears >= parameters.wholeNumber(ParameterKey.BUSY_MIN_OLDER_AGE);
        return new BusyWeekDose(
                parameters.wholeNumber(older ? ParameterKey.BUSY_MIN_SESSIONS_PER_WEEK_OLDER : ParameterKey.BUSY_MIN_SESSIONS_PER_WEEK),
                parameters.wholeNumber(older ? ParameterKey.BUSY_MIN_SETS_PER_EXERCISE_OLDER : ParameterKey.BUSY_MIN_SETS_PER_EXERCISE),
                parameters.flag(ParameterKey.BUSY_MIN_KEEP_LOAD));
    }
}
