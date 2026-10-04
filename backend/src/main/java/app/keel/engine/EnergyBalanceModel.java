package app.keel.engine;

import java.util.Objects;
import java.util.function.IntToDoubleFunction;

/**
 * Body weight over time from food intake: the adult energy balance model behind the NIH Body Weight Planner (K-605,
 * ADR-051). Hall et al., Lancet 2011, web appendix equations 1-9 — {@code arastirma/ham/H12-enerji-dengesi-modeli.md}.
 *
 * <p>Five quantities change day by day: body fat F, lean tissue L (eq. 3), glycogen G with the water stored with it (eq. 1),
 * extracellular fluid (eq. 2) and adaptive thermogenesis (eq. 7). Energy spent (eq. 9) depends on all of them, so a cut
 * slows as weight falls and the body adapts. Starting fat comes from weight, height and age (Jackson 2002, eq. 4); it
 * never leaves this class (U4) — the only output is weight.
 *
 * <p>The person starts in energy balance, eating their maintenance (Hall's starting condition; ADR-051 says how a
 * projection starts someone already partway through a cut). Two things keel does not know are held fixed: the share of
 * food that is carbohydrate (it only sets how fast glycogen settles, H12 M2) and dietary sodium (no change).
 *
 * <p>Arithmetic is {@code double} with {@link StrictMath}, so the same input gives the same output on every machine (ADR-003).
 */
public final class EnergyBalanceModel {

    // Unit definitions, not tunable rules (K2 covers thresholds): the thermochemical calorie, and SI prefixes.
    private static final double KJ_PER_KCAL = 4.184;
    private static final double KJ_PER_MJ = 1000;
    private static final double MG_PER_ML_TO_MG_PER_L = 1000;
    private static final double CM_PER_M = 100;
    private static final double PERCENT = 100;
    // Solver resolution: glycogen settles within about a day (H12 M2), so the day is cut into hours for the integration.
    private static final int STEPS_PER_DAY = 24;

    private EnergyBalanceModel() {
    }

    /**
     * Who the model starts from: in energy balance at {@code maintenanceKcal}. {@code restingKcal} is Mifflin-St Jeor
     * resting energy ({@link InitialTarget#restingKcal}); maintenance over resting is the activity level (eq. 8).
     */
    public record Start(Sex sex, Profile profile, double weightKg, double restingKcal, double maintenanceKcal) {
        public Start {
            Objects.requireNonNull(sex, "sex");
            Objects.requireNonNull(profile, "profile");
            if (!(weightKg > 0) || !(restingKcal > 0) || !(maintenanceKcal >= restingKcal)) {
                throw new IllegalArgumentException("weight and resting energy must be positive, and maintenance at least resting energy");
            }
        }
    }

    /**
     * Weight at the start and at the end of each of {@code days} days. {@code intakeKcalOnDay} gives what is eaten on day
     * d (0 = the first day), in kcal a day.
     */
    public static double[] weightsKg(Start start, IntToDoubleFunction intakeKcalOnDay, int days, Parameters parameters) {
        Objects.requireNonNull(intakeKcalOnDay, "intakeKcalOnDay");
        if (days < 0) {
            throw new IllegalArgumentException("days must be 0 or more");
        }
        if (parameters.sex() != start.sex()) {
            throw new IllegalArgumentException("parameters are for " + parameters.sex() + ", the person is " + start.sex());
        }
        Body body = new Body(start, parameters);
        double[] state = body.startingState();
        double[] weights = new double[days + 1];
        weights[0] = body.weight(state);
        double step = 1.0 / STEPS_PER_DAY;
        for (int day = 0; day < days; day++) {
            double intakeKcal = intakeKcalOnDay.applyAsDouble(day);
            // 0 is a fasting day; under 0, or not a number, is a bug in the caller — the model would run into negative glycogen.
            if (!(intakeKcal >= 0) || !Double.isFinite(intakeKcal)) {
                throw new IllegalArgumentException("intake on day " + day + " is not an amount that can be eaten: " + intakeKcal);
            }
            double intakeKj = intakeKcal * KJ_PER_KCAL;
            for (int i = 0; i < STEPS_PER_DAY; i++) {
                state = body.rungeKuttaStep(state, intakeKj, step);
            }
            weights[day + 1] = body.weight(state);
        }
        return weights;
    }

    /** The model's constants for one person, and the rates of change of the state. Energies in kJ, masses in kg, time in days. */
    private static final class Body {

        // State indices.
        private static final int FAT = 0;
        private static final int LEAN = 1;
        private static final int GLYCOGEN = 2;
        // Extracellular fluid, as the change from the start (L ≈ kg). H12 M4 subtracts the starting amount from lean tissue;
        // here it stays inside lean tissue instead. The same thing: weight is the same sum, the fat/lean split reads only fat,
        // and the extra γL × starting fluid is a constant that K absorbs.
        private static final int FLUID = 3;
        private static final int ADAPTATION = 4;

        private final double glycogenEnergy;
        private final double glycogenWater;
        private final double fatEnergy;
        private final double leanEnergy;
        private final double fatResting;
        private final double leanResting;
        private final double fatSynthesis;
        private final double leanSynthesis;
        private final double thermicEffect;
        private final double adaptiveRatio;
        private final double adaptiveDays;
        private final double sodium;
        private final double sodiumClearance;
        private final double carbSodium;
        private final double carbShare;
        private final double forbesEnergy;

        private final double startFat;
        private final double startLean;
        private final double startGlycogen;
        private final double maintenance;
        private final double activity;
        private final double constant;
        private final double glycogenRate;

        Body(Start start, Parameters p) {
            glycogenEnergy = p.number(ParameterKey.ENERGY_MODEL_GLYCOGEN_MJ_PER_KG) * KJ_PER_MJ;
            glycogenWater = p.number(ParameterKey.ENERGY_MODEL_GLYCOGEN_WATER_G_PER_G);
            fatEnergy = p.number(ParameterKey.ENERGY_MODEL_FAT_MJ_PER_KG) * KJ_PER_MJ;
            leanEnergy = p.number(ParameterKey.ENERGY_MODEL_LEAN_MJ_PER_KG) * KJ_PER_MJ;
            fatResting = p.number(ParameterKey.ENERGY_MODEL_FAT_RESTING_KJ_PER_KG_PER_DAY);
            leanResting = p.number(ParameterKey.ENERGY_MODEL_LEAN_RESTING_KJ_PER_KG_PER_DAY);
            fatSynthesis = p.number(ParameterKey.ENERGY_MODEL_FAT_SYNTHESIS_KJ_PER_KG);
            leanSynthesis = p.number(ParameterKey.ENERGY_MODEL_LEAN_SYNTHESIS_KJ_PER_KG);
            thermicEffect = p.number(ParameterKey.ENERGY_MODEL_THERMIC_EFFECT_RATIO);
            adaptiveRatio = p.number(ParameterKey.ENERGY_MODEL_ADAPTIVE_RATIO);
            adaptiveDays = p.wholeNumber(ParameterKey.ENERGY_MODEL_ADAPTIVE_DAYS);
            sodium = p.number(ParameterKey.ENERGY_MODEL_SODIUM_MG_PER_ML) * MG_PER_ML_TO_MG_PER_L;
            sodiumClearance = p.number(ParameterKey.ENERGY_MODEL_SODIUM_CLEARANCE_MG_PER_L_PER_DAY);
            carbSodium = p.number(ParameterKey.ENERGY_MODEL_CARB_SODIUM_MG_PER_DAY);
            carbShare = p.number(ParameterKey.ENERGY_MODEL_CARB_ENERGY_SHARE);
            // p = C / (C + F) with C = 10.4 kg × ρL / ρF (eq. 3).
            forbesEnergy = p.number(ParameterKey.ENERGY_MODEL_FORBES_KG) * leanEnergy / fatEnergy;

            double weight = start.weightKg();
            double heightM = start.profile().heightCm() / CM_PER_M;
            // Jackson 2002 (eq. 4).
            startFat = weight / PERCENT * (p.number(ParameterKey.ENERGY_MODEL_START_FAT_PCT_PER_YEAR) * start.profile().ageYears()
                    + p.number(ParameterKey.ENERGY_MODEL_START_FAT_PCT_PER_LN_BMI) * StrictMath.log(weight / (heightM * heightM))
                    + p.number(ParameterKey.ENERGY_MODEL_START_FAT_PCT_OFFSET));
            startGlycogen = p.number(ParameterKey.ENERGY_MODEL_GLYCOGEN_START_KG);
            startLean = weight - startFat - (1 + glycogenWater) * startGlycogen;
            if (!(startFat > 0) || !(startLean > 0)) {
                throw new IllegalArgumentException("the starting body composition is outside the model (weight " + weight + " kg)");
            }

            maintenance = start.maintenanceKcal() * KJ_PER_KCAL;
            double resting = start.restingKcal() * KJ_PER_KCAL;
            // δ = [(1 − βTEF) × PAL − 1] × RMR / BW (eq. 8), PAL = maintenance / resting.
            activity = ((1 - thermicEffect) * (maintenance / resting) - 1) * resting / weight;
            // Negative under maintenance / resting = 1 / (1 − βTEF), about 1.11: activity cannot spend less than nothing, and
            // the model's sources do not reach there.
            if (activity < 0) {
                throw new IllegalArgumentException("maintenance is too close to resting energy for the model's physical activity term");
            }
            // Energy balance at the start (H12 M5): K = EIb − γF·F0 − γL·L0 − δ·BW0.
            constant = maintenance - fatResting * startFat - leanResting * startLean - activity * weight;
            // kG = CIb / G_init² keeps glycogen still at the starting intake (eq. 1).
            glycogenRate = carbShare * maintenance / (startGlycogen * startGlycogen);
        }

        double[] startingState() {
            return new double[] {startFat, startLean, startGlycogen, 0, 0};
        }

        double weight(double[] s) {
            return s[FAT] + s[LEAN] + (1 + glycogenWater) * s[GLYCOGEN] + s[FLUID];
        }

        double[] rungeKuttaStep(double[] s, double intake, double h) {
            double[] k1 = rates(s, intake);
            double[] k2 = rates(add(s, k1, h / 2), intake);
            double[] k3 = rates(add(s, k2, h / 2), intake);
            double[] k4 = rates(add(s, k3, h), intake);
            double[] next = new double[s.length];
            for (int i = 0; i < s.length; i++) {
                next[i] = s[i] + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
            }
            return next;
        }

        private double[] rates(double[] s, double intake) {
            double carbs = carbShare * intake;
            double carbsAtStart = carbShare * maintenance;
            double change = intake - maintenance;

            // Glycogen (eq. 1) and extracellular fluid with no change of dietary sodium (eq. 2).
            double glycogen = (carbs - glycogenRate * s[GLYCOGEN] * s[GLYCOGEN]) / glycogenEnergy;
            double fluid = (-sodiumClearance * s[FLUID] - carbSodium * (1 - carbs / carbsAtStart)) / sodium;
            // Adaptive thermogenesis (eq. 7) and the thermic effect of food (eq. 6).
            double adaptation = (adaptiveRatio * change - s[ADAPTATION]) / adaptiveDays;
            double thermic = thermicEffect * change;

            // Expenditure in closed form (eq. 9), then its split between fat and lean tissue (eq. 3).
            double lean = forbesEnergy / (forbesEnergy + s[FAT]);
            double synthesis = lean * leanSynthesis / leanEnergy + (1 - lean) * fatSynthesis / fatEnergy;
            double stored = intake - glycogenEnergy * glycogen;
            double expenditure = (constant + fatResting * s[FAT] + leanResting * s[LEAN] + activity * weight(s) + thermic
                    + s[ADAPTATION] + stored * synthesis) / (1 + synthesis);
            double imbalance = stored - expenditure;

            double[] rates = new double[s.length];
            rates[FAT] = (1 - lean) * imbalance / fatEnergy;
            rates[LEAN] = lean * imbalance / leanEnergy;
            rates[GLYCOGEN] = glycogen;
            rates[FLUID] = fluid;
            rates[ADAPTATION] = adaptation;
            return rates;
        }

        private static double[] add(double[] s, double[] rates, double h) {
            double[] out = new double[s.length];
            for (int i = 0; i < s.length; i++) {
                out[i] = s[i] + h * rates[i];
            }
            return out;
        }
    }
}
