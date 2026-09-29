package app.keel.engine;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Deload looks at the body, not the calendar (Güray G7 K-66): nothing here counts weeks since the last deload.
 *
 * <ol>
 *   <li>A plateau (plateau_sessions without more reps or load, H3 B5) → stop adding load that week (G7 K-68, rung 1).</li>
 *   <li>Still stalled after holding for a week (frequency_per_muscle_per_week more sessions) → a lighter week, sets
 *       scaled by deload_volume_factor (G7 K-68, rung 2).</li>
 *   <li>stagnation_deload_months at the same loads, off a diet → a deload on its own (G7 K-69; on a cut, strength
 *       standing still is expected).</li>
 * </ol>
 *
 * <p>Not here yet: rung 3. G7 K-68 says "can't lift last week's loads → not fatigue, check food and sleep one by one",
 * while K-70/K-73 say "can't follow the plan → overtraining, one full week off". The two conflict; the product owner
 * decides (DURUM, L-12). Spec row WC-18 stays pending until then.
 */
public final class DeloadLadder {

    static final RuleId PLATEAU = new RuleId("plateau");
    static final RuleId LOAD_HELD_STILL_STALLED = new RuleId("load_held_still_stalled");
    static final RuleId LONG_STAGNATION = new RuleId("long_stagnation");

    private static final Source LADDER = new Source("arastirma/ham/guray/G7-whisper-arsiv.md#K-68", SourceTag.EXPERIENCE);
    private static final Source THREE_MONTHS = new Source("arastirma/ham/guray/G7-whisper-arsiv.md#K-69", SourceTag.EXPERIENCE);

    private static final int DAYS_PER_WEEK = 7;

    private DeloadLadder() {
    }

    public static Optional<Decision> check(TrainingStatus status, Snapshot snapshot, Parameters parameters) {
        BigDecimal setsFactor = BigDecimal.valueOf(parameters.number(ParameterKey.DELOAD_VOLUME_FACTOR));
        if (snapshot.phase() == Phase.BULK
                && status.monthsWithoutProgress() >= parameters.wholeNumber(ParameterKey.STAGNATION_DELOAD_MONTHS)) {
            return Optional.of(decision(snapshot, new Action.Deload(setsFactor), LONG_STAGNATION, THREE_MONTHS));
        }
        int plateau = parameters.wholeNumber(ParameterKey.PLATEAU_SESSIONS);
        if (status.stalledSessions() < plateau) {
            return Optional.empty();
        }
        if (!status.loadHeld()) {
            return Optional.of(decision(snapshot, new Action.StopLoadIncrease(), PLATEAU, LADDER));
        }
        int weekOfHolding = parameters.wholeNumber(ParameterKey.FREQUENCY_PER_MUSCLE_PER_WEEK);
        if (status.stalledSessions() >= plateau + weekOfHolding) {
            return Optional.of(decision(snapshot, new Action.Deload(setsFactor), LOAD_HELD_STILL_STALLED, LADDER));
        }
        return Optional.empty(); // holding week not over yet: keep holding
    }

    // A plateau threshold is expert opinion (H3 B5), so ladder calls are MEDIUM; looked at again next week.
    private static Decision decision(Snapshot snapshot, Action action, RuleId rule, Source source) {
        return new Decision(action, List.of(new Reason(rule, source)), Confidence.MEDIUM, snapshot.today().plusDays(DAYS_PER_WEEK),
                new CopyKey("decision." + action.type().name().toLowerCase(Locale.ROOT) + "." + rule.value()));
    }
}
