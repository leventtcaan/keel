package app.keel.engine;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * The first step of every decision (U13, ADR-003 §4): nothing lowers calories before this has looked.
 *
 * <ul>
 *   <li><b>Weekly loss cap</b> (cut only, dense data only): trend weight falling faster than min(weekly_loss_cap_kg, bodyweight ×
 *       weekly_loss_cap_pct_bodyweight) raises calories. Güray's 1 kg (G2 K-17: "don't try to go above it, you lose
 *       muscle") and the literature's 1 % (H3 Ç1) together: the 1 % only ever makes Güray's cap stricter.</li>
 *   <li><b>BMR floor</b>: a proposed calorie target is never below BMR; the answer is more movement instead
 *       (G2 K-11, G2 decision table). BMR is an input: Güray uses the value an online calculator gives.</li>
 *   <li><b>Low energy availability</b> (any phase): (plan kcal − exercise kcal) / fat-free mass at or under lea_threshold
 *       (male 25, female 30) narrows the deficit (J1 C6/L2.1, ADR-020 L-1/L-2). Fat-free mass comes from the internal
 *       fat estimate (U4: only the band leaves the engine). Under ea_warning the app warns; no decision changes.</li>
 *   <li><b>Rapid loss</b> (cut only): more than rapid_loss_narrow_pct of bodyweight in rapid_loss_window_weeks, while
 *       still losing, also narrows the deficit (J1 C6). Not a hard stop (ADR-020 L-1).</li>
 *   <li><b>The one hard stop</b> (any phase): a reported loss of the menstrual cycle ends any deficit — at least
 *       maintenance, see a doctor (J1 C6 third tier). It comes before every other rule.</li>
 * </ul>
 *
 * <p>When several deficit-narrowing rules fire, the strongest evidence leads (energy availability, then the 8-week
 * loss, then the weekly cap) and the others follow as supporting reasons.
 *
 * <p><b>The fat floor</b> (cut only, L-4, ADR-027 #1): a fat estimate under deficit_stop_fat_proxy_pct (male 8, female
 * 18; J1 L2.1) stops the deficit — alone it turns the phase to building; with a narrowing rule it joins that rule's
 * calorie increase as a supporting reason.
 */
public final class SafetyNet {

    static final RuleId LOSS_RATE_CAP = new RuleId("loss_rate_cap");
    static final RuleId LOSS_RATE_CAP_BODYWEIGHT = new RuleId("loss_rate_cap_bodyweight");
    static final RuleId BMR_FLOOR = new RuleId("bmr_floor");
    static final RuleId RAPID_LOSS = new RuleId("rapid_loss");
    static final RuleId LOW_ENERGY_AVAILABILITY = new RuleId("low_energy_availability");
    // ADR-027 #18: kept with the call under a general label — the cycle answer leaves no trace (ADR-020 L-1, GDPR Art. 9).
    static final RuleId LOW_ENERGY_SAFETY = new RuleId("low_energy_safety");
    static final RuleId LOW_FAT_FLOOR = new RuleId("low_fat_floor");

    private static final Source GURAY_LOSS_CAP = new Source("arastirma/ham/guray/G2-kilo-verme.md#K-17", SourceTag.EXPERIENCE);
    private static final Source LITERATURE_LOSS_CAP = new Source("arastirma/ham/H3-bosluk-literatur.md#Ç1", SourceTag.LITERATURE);
    private static final Source GURAY_BMR_FLOOR = new Source("arastirma/ham/guray/G2-kilo-verme.md#K-11", SourceTag.EXPERIENCE);
    private static final Source REDS_TIERS = new Source("arastirma/ham/J1-cinsiyet.md#C6", SourceTag.LITERATURE);
    private static final Source ENERGY_GATE = new Source("arastirma/ham/J1-cinsiyet.md#L2.1", SourceTag.LITERATURE);

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private static final int DAYS_PER_WEEK = 7;

    private SafetyNet() {
    }

    /** A safety decision if the data calls for one today; empty if the next step may decide. */
    public static Optional<Decision> check(Snapshot snapshot, Parameters parameters) {
        requireSameSex(snapshot, parameters);
        if (snapshot.menstrualLossReported()) {
            return Optional.of(safetyDecision(snapshot, new Action.HardStop(), List.of(new Reason(LOW_ENERGY_SAFETY, REDS_TIERS))));
        }
        List<Reason> narrow = new ArrayList<>();
        if (energyAvailability(snapshot, parameters).filter(band -> band == EnergyAvailability.LOW).isPresent()) {
            narrow.add(new Reason(LOW_ENERGY_AVAILABILITY, ENERGY_GATE));
        }
        // Both loss-rate rules are cut rules (G2 decision table: "loss above target and >1 kg/week"); a bulk losing
        // weight is a wrong-direction question for the weekly spine.
        if (snapshot.phase() == Phase.CUT) {
            if (lostTooMuchOverTheWindow(snapshot, parameters)) {
                narrow.add(new Reason(RAPID_LOSS, REDS_TIERS));
            }
            if (overTheWeeklyCap(snapshot, parameters)) {
                narrow.add(new Reason(LOSS_RATE_CAP, GURAY_LOSS_CAP));
                narrow.add(new Reason(LOSS_RATE_CAP_BODYWEIGHT, LITERATURE_LOSS_CAP));
            }
        }
        // L-4 (ADR-027 #1, J1 L2.1): a cut under the fat floor stops its deficit. When a narrowing rule fires too, its
        // calorie increase comes first — a phase change moves no calorie until it is applied (K-223 review) — and the
        // floor supports it; alone, the phase turns to building (maintenance is not a direction, 03 §2.1).
        boolean underTheFatFloor = snapshot.phase() == Phase.CUT && snapshot.fatProxyPct()
                .filter(pct -> pct.compareTo(BigDecimal.valueOf(parameters.number(ParameterKey.DEFICIT_STOP_FAT_PROXY_PCT))) < 0).isPresent();
        if (underTheFatFloor && narrow.isEmpty()) {
            return Optional.of(safetyDecision(snapshot, new Action.ChangePhase(Phase.BULK), List.of(new Reason(LOW_FAT_FLOOR, ENERGY_GATE))));
        }
        if (underTheFatFloor) {
            narrow.add(new Reason(LOW_FAT_FLOOR, ENERGY_GATE));
        }
        return narrow.isEmpty() ? Optional.empty()
                : Optional.of(safetyDecision(snapshot, new Action.IncreaseCalories(increaseKcal(snapshot, parameters)), narrow));
    }

    /**
     * At least one full step up (G7 K-97: "at least 500 up"); when the plan is under the low-energy floor by more than
     * that, all the way to the floor (J1 L2.1: widen until energy availability is above the line).
     */
    private static int increaseKcal(Snapshot snapshot, Parameters parameters) {
        int step = parameters.wholeNumber(ParameterKey.CUT_STEP_MIN_KCAL);
        int toFloor = leaFloorKcal(snapshot, parameters)
                .flatMap(floor -> snapshot.energy().map(budget -> floor - budget.targetKcal()))
                .orElse(0);
        return Math.max(step, toFloor);
    }

    private static boolean overTheWeeklyCap(Snapshot snapshot, Parameters parameters) {
        if (!enoughToMeasureALossRate(snapshot, parameters)) {
            return false;
        }
        LocalDate today = snapshot.today();
        int trendDays = parameters.wholeNumber(ParameterKey.TREND_DISPLAY_DAYS);
        Optional<BigDecimal> now = WeightTrend.at(snapshot.weights(), today, trendDays);
        Optional<BigDecimal> weekAgo = WeightTrend.at(snapshot.weights(), today.minusDays(DAYS_PER_WEEK), trendDays);
        if (now.isEmpty() || weekAgo.isEmpty()) {
            return false;
        }
        BigDecimal weeklyLoss = weekAgo.get().subtract(now.get());
        return weeklyLoss.compareTo(weeklyLossCapKg(now.get(), parameters)) > 0;
    }

    /**
     * Trend now against the trend rapid_loss_window_weeks ago, and only while the loss is still going on (trend lower
     * than a week ago). Once the deficit has been narrowed and weight holds, the 8-week figure stays high until the
     * window passes the old weight; narrowing again every week would stack calorie increases. Over eight weeks one
     * morning's water (~0.4 kg) is small next to 8 % of bodyweight, so any weigh-in at both ends is enough; with none
     * eight weeks back, nothing is judged.
     */
    private static boolean lostTooMuchOverTheWindow(Snapshot snapshot, Parameters parameters) {
        int trendDays = parameters.wholeNumber(ParameterKey.TREND_DISPLAY_DAYS);
        LocalDate today = snapshot.today();
        LocalDate windowStart = today.minusWeeks(parameters.wholeNumber(ParameterKey.RAPID_LOSS_WINDOW_WEEKS));
        Optional<BigDecimal> then = WeightTrend.at(snapshot.weights(), windowStart, trendDays);
        Optional<BigDecimal> weekAgo = WeightTrend.at(snapshot.weights(), today.minusDays(DAYS_PER_WEEK), trendDays);
        Optional<BigDecimal> now = WeightTrend.at(snapshot.weights(), today, trendDays);
        if (then.isEmpty() || weekAgo.isEmpty() || now.isEmpty() || now.get().compareTo(weekAgo.get()) >= 0) {
            return false;
        }
        BigDecimal allowed = then.get().multiply(BigDecimal.valueOf(parameters.number(ParameterKey.RAPID_LOSS_NARROW_PCT)));
        return then.get().subtract(now.get()).compareTo(allowed) > 0;
    }

    /**
     * Guards a calorie target another rule proposes (K-107): under BMR, move more instead of eating less.
     * A target exactly at BMR is allowed: the floor is "not below".
     */
    public static Optional<Decision> bmrFloor(int proposedKcal, int bmrKcal, Snapshot snapshot, Parameters parameters) {
        if (!parameters.flag(ParameterKey.BMR_FLOOR_ENABLED) || proposedKcal >= bmrKcal) {
            return Optional.empty();
        }
        return Optional.of(safetyDecision(snapshot, new Action.ChangeMovement(), List.of(new Reason(BMR_FLOOR, GURAY_BMR_FLOOR))));
    }

    /**
     * A loss rate is only read from two dense, consecutive weeks after the first no_interpretation_days: with one
     * weigh-in a week the noise on the difference (~1.2 kg at 95 %) is larger than the cap itself, and the first
     * week's drop is water and glycogen (G2 K-19, H1 §3.4).
     */
    private static boolean enoughToMeasureALossRate(Snapshot snapshot, Parameters parameters) {
        LocalDate today = snapshot.today();
        WeightSeries weights = snapshot.weights();
        int noInterpretationDays = parameters.wholeNumber(ParameterKey.NO_INTERPRETATION_DAYS);
        boolean pastFirstDays = weights.firstDay()
                .map(first -> !today.isBefore(first.plusDays(noInterpretationDays - 1L)))
                .orElse(false);
        int minPerWeek = parameters.wholeNumber(ParameterKey.MIN_WEIGHINS_PER_WEEK);
        boolean thisWeekDense = weights.countBetween(today.minusDays(DAYS_PER_WEEK - 1L), today) >= minPerWeek;
        boolean lastWeekDense = weights.countBetween(today.minusDays(2L * DAYS_PER_WEEK - 1), today.minusDays(DAYS_PER_WEEK)) >= minPerWeek;
        return pastFirstDays && thisWeekDense && lastWeekDense;
    }

    /** The energy-availability band of the current plan; empty without a plan budget, a fat estimate or a trend. */
    public static Optional<EnergyAvailability> energyAvailability(Snapshot snapshot, Parameters parameters) {
        requireSameSex(snapshot, parameters);
        Optional<BigDecimal> fatFree = fatFreeMassKg(snapshot, parameters);
        if (fatFree.isEmpty() || snapshot.energy().isEmpty()) {
            return Optional.empty();
        }
        EnergyBudget budget = snapshot.energy().get();
        // Exercise not known yet is at least 0: the target alone is the best case (K-216). Low even then is low; any
        // other band would be a guess.
        BigDecimal available = BigDecimal.valueOf((long) budget.targetKcal() - budget.exerciseKcalPerDay().orElse(0))
                .divide(fatFree.get(), MathContext.DECIMAL64);
        // "≤ threshold" is low (ADR-020 L-1, J1 C6 table); the warning and adequate lines are "under" (J1 L2.1).
        if (available.compareTo(line(ParameterKey.LEA_THRESHOLD_KCAL_PER_KG_FFM, parameters)) <= 0) {
            return Optional.of(EnergyAvailability.LOW);
        }
        if (budget.exerciseKcalPerDay().isEmpty()) {
            return Optional.empty();
        }
        if (available.compareTo(line(ParameterKey.EA_WARNING_KCAL_PER_KG_FFM, parameters)) < 0) {
            return Optional.of(EnergyAvailability.WARNING);
        }
        if (available.compareTo(line(ParameterKey.EA_ADEQUATE_KCAL_PER_KG_FFM, parameters)) < 0) {
            return Optional.of(EnergyAvailability.REDUCED);
        }
        return Optional.of(EnergyAvailability.ADEQUATE);
    }

    /**
     * The lowest whole daily target whose energy availability is above lea_threshold (on the line is already low):
     * the next whole kcal above threshold × fat-free mass, plus the exercise burn. A floor for calorie steps (K-107).
     * With the exercise not known yet, the part known for certain: a step under it is low whatever the exercise (K-216).
     */
    public static Optional<Integer> leaFloorKcal(Snapshot snapshot, Parameters parameters) {
        requireSameSex(snapshot, parameters);
        return fatFreeMassKg(snapshot, parameters).flatMap(fatFree -> snapshot.energy().map(budget ->
                line(ParameterKey.LEA_THRESHOLD_KCAL_PER_KG_FFM, parameters).multiply(fatFree)
                        .setScale(0, RoundingMode.FLOOR).intValueExact() + 1 + budget.exerciseKcalPerDay().orElse(0)));
    }

    // Fat-free mass = trend weight × (1 − fat estimate). U4: used inside the engine only.
    private static Optional<BigDecimal> fatFreeMassKg(Snapshot snapshot, Parameters parameters) {
        Optional<BigDecimal> weight = WeightTrend.at(snapshot.weights(), snapshot.today(),
                parameters.wholeNumber(ParameterKey.TREND_DISPLAY_DAYS));
        return weight.flatMap(kg -> snapshot.fatProxyPct().map(fatPct ->
                kg.multiply(BigDecimal.ONE.subtract(fatPct.divide(HUNDRED, MathContext.DECIMAL64)))));
    }

    // The energy lines differ by sex: a woman's plan read with the male line would miss a low-energy plan.
    private static void requireSameSex(Snapshot snapshot, Parameters parameters) {
        if (snapshot.sex() != parameters.sex()) {
            throw new IllegalArgumentException("Snapshot sex " + snapshot.sex() + " read with " + parameters.sex() + " parameters");
        }
    }

    private static BigDecimal line(ParameterKey key, Parameters parameters) {
        return BigDecimal.valueOf(parameters.number(key));
    }

    /** The weekly loss cap for this bodyweight, in kg: never above weekly_loss_cap_kg. */
    static BigDecimal weeklyLossCapKg(BigDecimal bodyweightKg, Parameters parameters) {
        BigDecimal absolute = BigDecimal.valueOf(parameters.number(ParameterKey.WEEKLY_LOSS_CAP_KG));
        BigDecimal relative = bodyweightKg.multiply(BigDecimal.valueOf(parameters.number(ParameterKey.WEEKLY_LOSS_CAP_PCT_BODYWEIGHT)));
        return absolute.min(relative);
    }

    // A safety call is made only on dense data (loss cap), a long window (8-week loss), given numbers (BMR floor,
    // energy availability) or the user's own report, and it errs toward caution, so it carries HIGH confidence; it is looked at again at the next weekly check-in (G2 decision table).
    // K-112 derives confidence for the other steps.
    private static Decision safetyDecision(Snapshot snapshot, Action action, List<Reason> reasons) {
        return new Decision(action, reasons, Confidence.HIGH, snapshot.today().plusDays(DAYS_PER_WEEK),
                new CopyKey("decision." + action.type().name().toLowerCase(Locale.ROOT) + "." + reasons.getFirst().rule().value()));
    }
}
