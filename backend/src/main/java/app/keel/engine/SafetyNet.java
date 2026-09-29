package app.keel.engine;

import java.math.BigDecimal;
import java.time.LocalDate;
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
 * </ul>
 *
 * <p>Not here yet: rapid loss over 8 weeks and low energy availability. The task card and the research disagree on
 * whether they stop the deficit or narrow it (plan/m1-kural-haritasi.md, L-1); they wait for that decision.
 */
public final class SafetyNet {

    static final RuleId LOSS_RATE_CAP = new RuleId("loss_rate_cap");
    static final RuleId LOSS_RATE_CAP_BODYWEIGHT = new RuleId("loss_rate_cap_bodyweight");
    static final RuleId BMR_FLOOR = new RuleId("bmr_floor");

    private static final Source GURAY_LOSS_CAP = new Source("arastirma/ham/guray/G2-kilo-verme.md#K-17", SourceTag.EXPERIENCE);
    private static final Source LITERATURE_LOSS_CAP = new Source("arastirma/ham/H3-bosluk-literatur.md#Ç1", SourceTag.LITERATURE);
    private static final Source GURAY_BMR_FLOOR = new Source("arastirma/ham/guray/G2-kilo-verme.md#K-11", SourceTag.EXPERIENCE);

    private static final int DAYS_PER_WEEK = 7;

    private SafetyNet() {
    }

    /** A safety decision if the data calls for one today; empty if the next step may decide. */
    public static Optional<Decision> check(Snapshot snapshot, Parameters parameters) {
        // The cap is a cut rule (G2 decision table: "loss above target and >1 kg/week"); a bulk losing weight is a
        // wrong-direction question for the weekly spine.
        if (snapshot.phase() != Phase.CUT || !enoughToMeasureALossRate(snapshot, parameters)) {
            return Optional.empty();
        }
        LocalDate today = snapshot.today();
        int trendDays = parameters.wholeNumber(ParameterKey.TREND_DISPLAY_DAYS);
        Optional<BigDecimal> now = WeightTrend.at(snapshot.weights(), today, trendDays);
        Optional<BigDecimal> weekAgo = WeightTrend.at(snapshot.weights(), today.minusDays(DAYS_PER_WEEK), trendDays);
        if (now.isEmpty() || weekAgo.isEmpty()) {
            return Optional.empty();
        }
        BigDecimal weeklyLoss = weekAgo.get().subtract(now.get());
        if (weeklyLoss.compareTo(weeklyLossCapKg(now.get(), parameters)) <= 0) {
            return Optional.empty();
        }
        return Optional.of(safetyDecision(snapshot, new Action.IncreaseCalories(),
                List.of(new Reason(LOSS_RATE_CAP, GURAY_LOSS_CAP), new Reason(LOSS_RATE_CAP_BODYWEIGHT, LITERATURE_LOSS_CAP))));
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

    /** The weekly loss cap for this bodyweight, in kg: never above weekly_loss_cap_kg. */
    static BigDecimal weeklyLossCapKg(BigDecimal bodyweightKg, Parameters parameters) {
        BigDecimal absolute = BigDecimal.valueOf(parameters.number(ParameterKey.WEEKLY_LOSS_CAP_KG));
        BigDecimal relative = bodyweightKg.multiply(BigDecimal.valueOf(parameters.number(ParameterKey.WEEKLY_LOSS_CAP_PCT_BODYWEIGHT)));
        return absolute.min(relative);
    }

    // A safety call is made only on dense data (loss cap) or on given numbers (BMR floor), and it errs toward
    // caution, so it carries HIGH confidence; it is looked at again at the next weekly check-in (G2 decision table).
    // K-112 derives confidence for the other steps.
    private static Decision safetyDecision(Snapshot snapshot, Action action, List<Reason> reasons) {
        return new Decision(action, reasons, Confidence.HIGH, snapshot.today().plusDays(DAYS_PER_WEEK),
                new CopyKey("decision." + action.type().name().toLowerCase(Locale.ROOT) + "." + reasons.getFirst().rule().value()));
    }
}
