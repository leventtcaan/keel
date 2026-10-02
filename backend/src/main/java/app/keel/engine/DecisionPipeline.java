package app.keel.engine;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * The assembled engine (K-112, ADR-003 §4 as detailed by ADR-022): one Snapshot in, one Decision out, the steps in a fixed order and the first
 * one that decides stops the chain.
 *
 * <ol>
 *   <li>Safety net (U13): the one hard stop, low energy, losing too fast.</li>
 *   <li>The mini cut's day has come (K-227): back to building, whatever else would wait.</li>
 *   <li>A state the user declared this week (K-516): the call waits.</li>
 *   <li>Training going wrong — a plan missed two weeks running, or last week's loads lost (G7 K-68/K-70/K-73): Güray's
 *       tree fixes training before any food decision.</li>
 *   <li>Maintenance being observed (G2 K-8) · not enough weight data (U8): nothing about food yet.</li>
 *   <li>Phase gate (K-105) · mini cut (G7 K-102).</li>
 *   <li>The weekly spine (K-106); a calorie call goes through the ladder (K-107) with Mifflin resting energy as BMR
 *       (K-114).</li>
 * </ol>
 *
 * <p>A quiet week — continue, or "not yet" — leaves room for the progression rungs (hold the load, deload; K-110). A food
 * decision takes the week over a plateau: one variable at a time; the plateau is looked at next week.
 *
 * <p>Confidence: the safety net and the rules with their own evidence keep theirs; a weight-based call is HIGH when every
 * week of the window has dense_weighins_per_week, MEDIUM otherwise; "not yet" is always LOW.
 */
public final class DecisionPipeline {

    static final RuleId PLAN_TARGET_NEEDED = new RuleId("plan_target_needed");
    static final RuleId PROFILE_NEEDED = new RuleId("profile_needed");
    static final RuleId FAT_ESTIMATE_NEEDED = new RuleId("fat_estimate_needed");
    private static final Source PLAN_TARGET = new Source("arastirma/ham/guray/G2-kilo-verme.md#K-8", SourceTag.EXPERIENCE);
    private static final Source RESTING_FORMULA = new Source("arastirma/ham/H6-baslangic-kalori.md#A1", SourceTag.LITERATURE);
    private static final Source WOMEN_ENERGY_RISK = new Source("arastirma/ham/J1-cinsiyet.md#C6", SourceTag.LITERATURE);

    private static final int DAYS_PER_WEEK = 7;

    private DecisionPipeline() {
    }

    /** The decision for this Snapshot. Parameters of the other sex are refused by the first step, the safety net. */
    public static Decision decide(Snapshot snapshot, Parameters parameters) {
        Optional<Decision> safety = SafetyNet.check(snapshot, parameters);
        if (safety.isPresent()) {
            return safety.get();
        }
        // After a hard stop, no call opens a deficit again before the cycle question is answered (K-229).
        return SafetyHold.check(afterTheSafetyNet(snapshot, parameters), snapshot);
    }

    private static Decision afterTheSafetyNet(Snapshot snapshot, Parameters parameters) {
        Optional<Decision> miniCutOver = MiniCutGate.over(snapshot, parameters);
        if (miniCutOver.isPresent()) {
            return miniCutOver.get();
        }
        // A week the user declared disturbed waits, training going wrong included: a sick week's missed sessions are no
        // overtraining (K-516, ADR-038).
        Optional<Decision> declared = StateMode.check(snapshot);
        if (declared.isPresent()) {
            return declared.get();
        }
        Optional<Decision> ladder = snapshot.training().flatMap(status -> DeloadLadder.check(status, snapshot, parameters));
        if (ladder.isPresent() && trainingGoingWrong(ladder.get())) {
            return ladder.get();
        }
        Optional<Decision> notYet = InitialTarget.observing(snapshot, parameters).or(() -> DataSufficiency.check(snapshot, parameters));
        if (notYet.isPresent()) {
            return ladder.orElse(low(notYet.get()));
        }
        Optional<Decision> direction = PhaseGate.check(snapshot, parameters).or(() -> MiniCutGate.check(snapshot, parameters));
        if (direction.isPresent()) {
            return direction.get();
        }
        Decision weekly = switch (WeeklySpine.evaluate(snapshot, parameters)) {
            case SpineResult.Decided(Decision decided) -> decided;
            case SpineResult.CaloriesNeeded need -> MiniCutGate.running(snapshot).orElseGet(() -> calorieStep(need, snapshot, parameters));
        };
        boolean quiet = weekly.action() instanceof Action.Continue || weekly.action() instanceof Action.NoDecisionYet;
        if (quiet && ladder.isPresent()) {
            return ladder.get();
        }
        return withDensity(weekly, snapshot, parameters);
    }

    private static boolean trainingGoingWrong(Decision ladder) {
        return ladder.action() instanceof Action.FullRestWeek || ladder.action() instanceof Action.FixRecovery;
    }

    /**
     * The ladder needs the plan's current target, and on the way down the profile (BMR and the macro floors). A Snapshot
     * without them is valid; the answer is to ask for exactly what is missing (U3), not to fail.
     */
    private static Decision calorieStep(SpineResult.CaloriesNeeded need, Snapshot snapshot, Parameters parameters) {
        if (snapshot.energy().isEmpty()) {
            return missing(snapshot, PLAN_TARGET_NEEDED, PLAN_TARGET);
        }
        if (need.direction() == CalorieDirection.UP) {
            return CalorieLadder.step(need, snapshot, 0, parameters); // no floor on the way up
        }
        if (snapshot.profile().isEmpty()) {
            return missing(snapshot, PROFILE_NEEDED, RESTING_FORMULA);
        }
        // ADR-027 #11b: without a fat estimate the low-energy floor cannot be computed, and low energy is the higher risk
        // for women (J1 C6): no step down for her until there is one. Calorie steps up and the safety net still run.
        if (snapshot.sex() == Sex.FEMALE && snapshot.fatProxyPct().isEmpty()) {
            return missing(snapshot, FAT_ESTIMATE_NEEDED, WOMEN_ENERGY_RISK);
        }
        // Mifflin-St Jeor on today's trend weight is the BMR the step may not go under (K-114, G2 K-11). The spine ran
        // after DataSufficiency, so the window's weeks all have weigh-ins and today's trend exists.
        BigDecimal weight = WeightTrend.at(snapshot.weights(), snapshot.today(), parameters.wholeNumber(ParameterKey.TREND_DISPLAY_DAYS))
                .orElseThrow();
        return CalorieLadder.step(need, snapshot, InitialTarget.restingKcal(snapshot.sex(), weight, snapshot.profile().get(), parameters),
                parameters);
    }

    private static Decision missing(Snapshot snapshot, RuleId rule, Source source) {
        return new Decision(new Action.NoDecisionYet(), List.of(new Reason(rule, source)), Confidence.LOW,
                snapshot.today().plusDays(DAYS_PER_WEEK), new CopyKey("decision.no_decision_yet." + rule.value()));
    }

    /** "Not yet" is always LOW; a weight-based call is HIGH on dense data, else MEDIUM. Other steps keep their own. */
    private static Decision withDensity(Decision decision, Snapshot snapshot, Parameters parameters) {
        if (decision.action() instanceof Action.NoDecisionYet) {
            return low(decision);
        }
        if (decision.confidence() == Confidence.HIGH) {
            return decision; // the safety net's floors carry their own evidence
        }
        return with(decision, denseWindow(snapshot, parameters) ? Confidence.HIGH : Confidence.MEDIUM);
    }

    private static boolean denseWindow(Snapshot snapshot, Parameters parameters) {
        int dense = parameters.wholeNumber(ParameterKey.DENSE_WEIGHINS_PER_WEEK);
        int weeks = parameters.wholeNumber(ParameterKey.DECISION_WINDOW_DAYS) / DAYS_PER_WEEK;
        for (int week = 0; week < weeks; week++) {
            LocalDate weekEnd = snapshot.today().minusDays((long) week * DAYS_PER_WEEK);
            if (snapshot.weights().countBetween(weekEnd.minusDays(DAYS_PER_WEEK - 1L), weekEnd) < dense) {
                return false;
            }
        }
        return true;
    }

    private static Decision low(Decision decision) {
        return with(decision, Confidence.LOW);
    }

    private static Decision with(Decision decision, Confidence confidence) {
        return new Decision(decision.action(), decision.reasons(), confidence, decision.nextReview(), decision.copyKey());
    }
}
