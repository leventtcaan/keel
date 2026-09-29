package app.keel.engine;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * The calorie ladder (K-107): how far a calorie decision of the weekly spine moves the daily target.
 *
 * <ul>
 *   <li><b>Step size.</b> A cut moves cut_step_min_kcal, down or up (G7 K-97: "at least 500 down or at least 500 up";
 *       300-400 is measurement noise. The literature's 5-10 % of intake, H3 B3, loses to Güray, U14). A bulk moves
 *       bulk_step_kcal (G3 K-10), also when the genetic limit pulls it back.</li>
 *   <li><b>Where it lands.</b> Only the calorie target moves; macros follow from it (K-108), which holds protein and
 *       fat and moves carbs — so a bulk step is all carbs (G3 K-10) and a cut takes fat down only once carbs reach their
 *       floor (the task card: fat to 1 g/kg first, then carbs as the lever; 03 §2.3).</li>
 *   <li><b>Floors on the way down</b>, in order: BMR — move more instead (G2 K-11); the low-energy floor — a shorter
 *       step, or none (J1 L2.1); the macro floors — move more instead (ADR-020 L-11).</li>
 *   <li><b>Spacing.</b> At least calorie_change_min_wait_weeks since the plan started (H3 B3).</li>
 * </ul>
 *
 * <p>Whether calories may move at all is decided before this (the spine, K-106): adherence, and on a cut, training
 * rather than the scale (G7 K-98).
 */
public final class CalorieLadder {

    static final RuleId CUT_STEP = new RuleId("cut_step");
    static final RuleId BULK_STEP = new RuleId("bulk_step");
    static final RuleId LEA_FLOOR = new RuleId("lea_floor");
    static final RuleId ENERGY_FLOOR = new RuleId("energy_floor");
    static final RuleId CALORIE_CHANGE_TOO_SOON = new RuleId("calorie_change_too_soon");

    private static final Source MINIMUM_STEP = new Source("arastirma/ham/guray/G7-whisper-arsiv.md#K-97", SourceTag.EXPERIENCE);
    private static final Source BULK_STEP_SOURCE = new Source("arastirma/ham/guray/G3-kilo-alma-beslenme.md#K-10", SourceTag.EXPERIENCE);
    private static final Source ENERGY_GATE = new Source("arastirma/ham/J1-cinsiyet.md#L2.1", SourceTag.LITERATURE);
    private static final Source SPACING = new Source("arastirma/ham/H3-bosluk-literatur.md#B3", SourceTag.LITERATURE);

    private static final int DAYS_PER_WEEK = 7;

    private CalorieLadder() {
    }

    /**
     * The decision for a calorie change the spine asked for. The snapshot must carry the plan's current target and the
     * profile (for the macro floors); {@code bmrKcal} is the resting energy the target may not go under.
     */
    public static Decision step(SpineResult.CaloriesNeeded need, Snapshot snapshot, int bmrKcal, Parameters parameters) {
        int target = snapshot.energy().map(EnergyBudget::targetKcal)
                .orElseThrow(() -> new IllegalArgumentException("A calorie step needs the plan's current target"));
        Profile profile = snapshot.profile()
                .orElseThrow(() -> new IllegalArgumentException("A calorie step needs the profile (age) for the macro floors"));

        LocalDate earliest = snapshot.planStart().plusWeeks(parameters.wholeNumber(ParameterKey.CALORIE_CHANGE_MIN_WAIT_WEEKS));
        if (snapshot.today().isBefore(earliest)) {
            return decision(snapshot, new Action.NoDecisionYet(), List.of(new Reason(CALORIE_CHANGE_TOO_SOON, SPACING)), earliest);
        }

        boolean cut = snapshot.phase() == Phase.CUT;
        int size = parameters.wholeNumber(cut ? ParameterKey.CUT_STEP_MIN_KCAL : ParameterKey.BULK_STEP_KCAL);
        List<Reason> reasons = new ArrayList<>(need.reasons());
        reasons.add(cut ? new Reason(CUT_STEP, MINIMUM_STEP) : new Reason(BULK_STEP, BULK_STEP_SOURCE));
        int window = parameters.wholeNumber(ParameterKey.DECISION_WINDOW_DAYS);

        if (need.direction() == CalorieDirection.UP) {
            return decision(snapshot, new Action.AdjustCalories(size), reasons, snapshot.today().plusDays(window));
        }

        int proposed = target - size;
        Optional<Decision> underBmr = SafetyNet.bmrFloor(proposed, bmrKcal, snapshot, parameters);
        if (underBmr.isPresent()) {
            return underBmr.get();
        }
        Optional<Integer> leaFloor = SafetyNet.leaFloorKcal(snapshot, parameters);
        if (leaFloor.isPresent() && proposed < leaFloor.get()) {
            if (leaFloor.get() >= target) {
                // No room above the floor: no cut, and no extra exercise either — it would lower availability further.
                return decision(snapshot, new Action.Continue(), List.of(new Reason(ENERGY_FLOOR, ENERGY_GATE)),
                        snapshot.today().plusDays(DAYS_PER_WEEK));
            }
            proposed = leaFloor.get();
            reasons.add(new Reason(LEA_FLOOR, ENERGY_GATE));
        }
        BigDecimal bodyweight = WeightTrend.at(snapshot.weights(), snapshot.today(), parameters.wholeNumber(ParameterKey.TREND_DISPLAY_DAYS))
                .orElseThrow(() -> new IllegalArgumentException("A calorie step needs a weight trend"));
        if (MacroTargets.forTarget(proposed, bodyweight, snapshot.sex(), profile.ageYears(), parameters)
                instanceof MacroResult.TargetTooLow(int _, List<Reason> squeeze)) {
            // ADR-020 L-11: no honest macro split under this target; like the BMR floor, move more instead.
            return decision(snapshot, new Action.ChangeMovement(), squeeze, snapshot.today().plusDays(DAYS_PER_WEEK));
        }
        return decision(snapshot, new Action.AdjustCalories(proposed - target), reasons, snapshot.today().plusDays(window));
    }

    // Ladder calls rest on the spine's reading of the window; the assembly (K-112) derives the final confidence.
    private static Decision decision(Snapshot snapshot, Action action, List<Reason> reasons, LocalDate nextReview) {
        return new Decision(action, reasons, Confidence.MEDIUM, nextReview,
                new CopyKey("decision." + action.type().name().toLowerCase(Locale.ROOT) + "." + reasons.getFirst().rule().value()));
    }
}
