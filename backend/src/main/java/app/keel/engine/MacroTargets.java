package app.keel.engine;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Macro targets for a calorie target (K-108).
 *
 * <ol>
 *   <li>Protein: bodyweight × protein_g_per_kg — total bodyweight, not lean mass (Güray G3 K-18/K-19); women 45+ use
 *       protein_g_per_kg_female_45_plus from protein_female_higher_from_age (J1 A5, C5). Never lowered to make room for anything.</li>
 *   <li>Fat: starts at fat_g_per_kg_max (G3 K-21).</li>
 *   <li>Carbs: what is left (03 §2.3: carbs are the lever).</li>
 *   <li>If carbs fall under carbs_min_g_per_day, fat gives way first, never under fat_g_per_kg_min (G2 K-22). If that
 *       is still not enough the split is kept and a carb squeeze is reported (H3 Ç3). H3 would then trim protein to
 *       1.8 g/kg; Güray's 2 g/kg wins (U14), so it does not.</li>
 *   <li>Fibre: a fixed daily amount, not a share of calories (H3 B11).</li>
 * </ol>
 *
 * <p>Grams are whole; protein and fat round half up, carbs are computed from the rounded protein and fat so the
 * grams add back up to the target within 2 kcal.
 */
public final class MacroTargets {

    static final RuleId CARB_SQUEEZE = new RuleId("carb_squeeze");
    private static final Source SQUEEZE = new Source("arastirma/ham/H3-bosluk-literatur.md#Ç3", SourceTag.LITERATURE);

    // Atwater general factors: energy per gram. A unit conversion, not a tunable threshold.
    private static final int KCAL_PER_G_PROTEIN = 4;
    private static final int KCAL_PER_G_FAT = 9;
    private static final int KCAL_PER_G_CARBS = 4;

    private MacroTargets() {
    }

    public static Macros forTarget(int kcal, BigDecimal bodyweightKg, Sex sex, int ageYears, Parameters parameters) {
        if (kcal <= 0 || bodyweightKg.signum() <= 0 || ageYears < 0) {
            throw new IllegalArgumentException(
                    "Macros need a positive calorie target and bodyweight and an age, got " + kcal + " kcal, " + bodyweightKg + " kg, " + ageYears);
        }
        ParameterKey proteinKey = sex == Sex.FEMALE && ageYears >= parameters.wholeNumber(ParameterKey.PROTEIN_FEMALE_HIGHER_FROM_AGE)
                ? ParameterKey.PROTEIN_G_PER_KG_FEMALE_45_PLUS : ParameterKey.PROTEIN_G_PER_KG;
        int protein = grams(bodyweightKg, parameters.number(proteinKey));
        int fatMax = grams(bodyweightKg, parameters.number(ParameterKey.FAT_G_PER_KG_MAX));
        int fatMin = grams(bodyweightKg, parameters.number(ParameterKey.FAT_G_PER_KG_MIN));
        double carbsMin = parameters.number(ParameterKey.CARBS_MIN_G_PER_DAY);
        int fiber = (int) Math.round(parameters.number(ParameterKey.FIBER_G_PER_DAY));

        int fat = fatMax;
        List<Reason> notes = List.of();
        if (carbsFor(kcal, protein, fat) < carbsMin) {
            // Room for the carb floor, taken from fat but never below its floor.
            int fatForCarbFloor = (int) Math.floor((kcal - protein * KCAL_PER_G_PROTEIN - carbsMin * KCAL_PER_G_CARBS) / KCAL_PER_G_FAT);
            fat = Math.max(fatMin, Math.min(fatMax, fatForCarbFloor));
            notes = List.of(new Reason(CARB_SQUEEZE, SQUEEZE));
        }
        int carbs = (int) Math.max(0, Math.round(carbsFor(kcal, protein, fat)));
        return new Macros(protein, fat, carbs, fiber, notes);
    }

    private static double carbsFor(int kcal, int proteinG, int fatG) {
        return (kcal - proteinG * KCAL_PER_G_PROTEIN - fatG * KCAL_PER_G_FAT) / (double) KCAL_PER_G_CARBS;
    }

    private static int grams(BigDecimal bodyweightKg, double gramsPerKg) {
        return bodyweightKg.multiply(BigDecimal.valueOf(gramsPerKg)).setScale(0, RoundingMode.HALF_UP).intValueExact();
    }
}
