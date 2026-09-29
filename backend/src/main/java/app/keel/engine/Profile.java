package app.keel.engine;

/**
 * The profile facts the engine's formulas need: age (protein for women 45+, K-108; resting energy, K-114) and height
 * (resting energy, K-114).
 */
public record Profile(int ageYears, int heightCm) {

    public Profile {
        if (ageYears <= 0 || heightCm <= 0) {
            throw new IllegalArgumentException("Age and height are positive, got " + ageYears + " years, " + heightCm + " cm");
        }
    }
}
