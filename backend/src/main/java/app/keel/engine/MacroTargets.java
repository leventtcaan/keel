package app.keel.engine;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Macro targets for a calorie target (K-108).
 *
 * <ol>
 *   <li>Protein: bodyweight × protein_g_per_kg — total bodyweight, not lean mass (coaching experience, G3 K-18/K-19); women 45+ use
 *       protein_g_per_kg_female_45_plus from protein_female_higher_from_age (J1 A5, C5). Never lowered to make room for anything.</li>
 *   <li>Fat: starts at fat_g_per_kg_max (G3 K-21).</li>
 *   <li>Carbs: what is left (03 §2.3: carbs are the lever).</li>
 *   <li>If carbs fall under carbs_min_g_per_day, fat gives way first, never under fat_g_per_kg_min (G2 K-22), and the
 *       split notes it.</li>
 *   <li>If even that cannot fit — protein, fat floor and carb floor together exceed the target — there is no honest
 *       split: zero carb is rejected (03 §2.3) and H3 Ç3's protein cut to 1.8 g/kg loses to the coaching 2 g/kg (U14). The
 *       result is {@link MacroResult.TargetTooLow} with the smallest target that fits (H3 Ç3: "don't cut this far").</li>
 *   <li>Fibre: a fixed daily amount, not a share of calories (H3 B11).</li>
 * </ol>
 *
 * <p>Grams are whole; protein and fat round half up, carbs are computed from the rounded protein and fat so every
 * split adds back up to the target within 2 kcal.
 */
public final class MacroTargets {

    static final RuleId CARB_SQUEEZE = new RuleId("carb_squeeze");
    static final RuleId FAT_TRIMMED_FOR_CARBS = new RuleId("fat_trimmed_for_carbs");
    private static final Source SQUEEZE = new Source("arastirma/ham/H3-bosluk-literatur.md#Ç3", SourceTag.LITERATURE);
    private static final Source FAT_FLOOR = new Source("arastirma/ham/guray/G2-kilo-verme.md#K-22", SourceTag.EXPERIENCE);

    // Atwater general factors: energy per gram. A unit conversion, not a tunable threshold.
    private static final int KCAL_PER_G_PROTEIN = 4;
    private static final int KCAL_PER_G_FAT = 9;
    private static final int KCAL_PER_G_CARBS = 4;

    private MacroTargets() {
    }

    public static MacroResult forTarget(int kcal, BigDecimal bodyweightKg, Sex sex, int ageYears, Parameters parameters) {
        if (kcal <= 0 || bodyweightKg.signum() <= 0 || ageYears < 0) {
            throw new IllegalArgumentException(
                    "Macros need a positive calorie target and bodyweight and an age, got " + kcal + " kcal, " + bodyweightKg + " kg, " + ageYears);
        }
        int protein = proteinG(bodyweightKg, sex, ageYears, parameters);
        int fatMax = grams(bodyweightKg, parameters.number(ParameterKey.FAT_G_PER_KG_MAX));
        int fatMin = grams(bodyweightKg, parameters.number(ParameterKey.FAT_G_PER_KG_MIN));
        double carbsMin = parameters.number(ParameterKey.CARBS_MIN_G_PER_DAY);
        int fiber = (int) Math.round(parameters.number(ParameterKey.FIBER_G_PER_DAY));

        // The smallest target that keeps protein and both floors; below it no honest split exists.
        int minimumKcal = (int) Math.ceil(protein * KCAL_PER_G_PROTEIN + fatMin * KCAL_PER_G_FAT + carbsMin * KCAL_PER_G_CARBS);
        if (kcal < minimumKcal) {
            return new MacroResult.TargetTooLow(minimumKcal, List.of(new Reason(CARB_SQUEEZE, SQUEEZE)));
        }

        int fat = fatMax;
        List<Reason> notes = List.of();
        if (carbsFor(kcal, protein, fat) < carbsMin) {
            // Room for the carb floor, taken from fat but never below its floor (fits, as kcal >= minimumKcal).
            int fatForCarbFloor = (int) Math.floor((kcal - protein * KCAL_PER_G_PROTEIN - carbsMin * KCAL_PER_G_CARBS) / KCAL_PER_G_FAT);
            fat = Math.max(fatMin, Math.min(fatMax, fatForCarbFloor));
            notes = List.of(new Reason(FAT_TRIMMED_FOR_CARBS, FAT_FLOOR));
        }
        int carbs = (int) Math.round(carbsFor(kcal, protein, fat));
        return new MacroResult.Split(new Macros(protein, fat, carbs, fiber, notes));
    }

    /**
     * The day's protein: bodyweight × protein_g_per_kg (women from protein_female_higher_from_age: the 45+ value). It
     * does not depend on the calorie target — never lowered to make room for anything — so it is known even when no split
     * fits the target (K-216).
     */
    public static int proteinG(BigDecimal bodyweightKg, Sex sex, int ageYears, Parameters parameters) {
        ParameterKey proteinKey = sex == Sex.FEMALE && ageYears >= parameters.wholeNumber(ParameterKey.PROTEIN_FEMALE_HIGHER_FROM_AGE)
                ? ParameterKey.PROTEIN_G_PER_KG_FEMALE_45_PLUS : ParameterKey.PROTEIN_G_PER_KG;
        return grams(bodyweightKg, parameters.number(proteinKey));
    }

    private static double carbsFor(int kcal, int proteinG, int fatG) {
        return (kcal - proteinG * KCAL_PER_G_PROTEIN - fatG * KCAL_PER_G_FAT) / (double) KCAL_PER_G_CARBS;
    }

    private static int grams(BigDecimal bodyweightKg, double gramsPerKg) {
        return bodyweightKg.multiply(BigDecimal.valueOf(gramsPerKg)).setScale(0, RoundingMode.HALF_UP).intValueExact();
    }
}
