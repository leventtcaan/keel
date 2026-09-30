package app.keel.engine;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Deload looks at the body, not the calendar (Güray G7 K-66): nothing here counts weeks since the last deload.
 *
 * <p>Two signals come first (rung 3, ADR-020 L-12):
 * <ul>
 *   <li>The planned sessions could not be done as planned for overtraining_missed_plan_weeks in a row → overtraining
 *       by its operational definition (G7 K-73) → one full week off, not a light one (G7 K-70).</li>
 *   <li>Last week's loads cannot be lifted any more → going backwards is not fatigue; food and sleep are checked one
 *       by one (G7 K-68 rung 3), whether or not a plateau was reached. Not on a cut: there strength dropping is
 *       expected (G6 K-30) and the weekly spine treats it as a red flag against cutting further (G2 decision table).</li>
 * </ul>
 * Then the stall rungs:
 *
 * <ol>
 *   <li>A plateau (plateau_sessions without more reps or load, H3 B5) → stop adding load that week (G7 K-68, rung 1).</li>
 *   <li>Still stalled after a week of holding (one completed weekly review) → a lighter week, sets scaled by
 *       deload_volume_factor (G7 K-68, rung 2). The acceptance's other option, cutting load 30-40 %
 *       (deload_load_reduction_*), is not used: one option satisfies it and fewer sets is what the parameter carries.</li>
 *   <li>stagnation_deload_months at the same loads, off a diet → a deload on its own (G7 K-69; on a cut, strength
 *       standing still is expected).</li>
 * </ol>
 *
 * <p>The week after a deload or a week off is never another ladder call (G7 K-72). Rungs 1-2 also run on a cut,
 * where K-68 sets no diet condition (ADR-027 #3: they do).
 */
public final class DeloadLadder {

    static final RuleId PLATEAU = new RuleId("plateau");
    static final RuleId LOAD_HELD_STILL_STALLED = new RuleId("load_held_still_stalled");
    static final RuleId LONG_STAGNATION = new RuleId("long_stagnation");
    static final RuleId PLAN_MISSED = new RuleId("plan_missed");
    static final RuleId FULL_REST = new RuleId("full_rest_week");
    static final RuleId LOADS_REGRESSED = new RuleId("loads_regressed");

    private static final Source LADDER = new Source("arastirma/ham/guray/G7-whisper-arsiv.md#K-68", SourceTag.EXPERIENCE);
    private static final Source THREE_MONTHS = new Source("arastirma/ham/guray/G7-whisper-arsiv.md#K-69", SourceTag.EXPERIENCE);
    private static final Source OVERTRAINING_TEST = new Source("arastirma/ham/guray/G7-whisper-arsiv.md#K-73", SourceTag.EXPERIENCE);
    private static final Source WEEK_OFF = new Source("arastirma/ham/guray/G7-whisper-arsiv.md#K-70", SourceTag.EXPERIENCE);

    private static final int DAYS_PER_WEEK = 7;

    private DeloadLadder() {
    }

    public static Optional<Decision> check(TrainingStatus status, Snapshot snapshot, Parameters parameters) {
        if (status.restedLastWeek()) {
            return Optional.empty(); // G7 K-72: after a lighter week or a week off, come back gradually
        }
        if (status.weeksPlanMissed() >= parameters.wholeNumber(ParameterKey.OVERTRAINING_MISSED_PLAN_WEEKS)) {
            return Optional.of(decision(snapshot, new Action.FullRestWeek(),
                    List.of(new Reason(PLAN_MISSED, OVERTRAINING_TEST), new Reason(FULL_REST, WEEK_OFF))));
        }
        // On a cut, strength dropping is expected (G6 K-30) and is the spine's red flag (G2 decision table, K-106).
        if (status.loadsBelowLastWeek() && snapshot.phase() != Phase.CUT) {
            return Optional.of(decision(snapshot, new Action.FixRecovery(), LOADS_REGRESSED, LADDER));
        }
        BigDecimal setsFactor = BigDecimal.valueOf(parameters.number(ParameterKey.DELOAD_VOLUME_FACTOR));
        if (snapshot.phase() == Phase.BULK
                && status.monthsStalled() >= parameters.wholeNumber(ParameterKey.STAGNATION_DELOAD_MONTHS)) {
            return Optional.of(decision(snapshot, new Action.Deload(setsFactor), LONG_STAGNATION, THREE_MONTHS));
        }
        if (status.stalledSessions() < parameters.wholeNumber(ParameterKey.PLATEAU_SESSIONS)) {
            return Optional.empty();
        }
        if (status.weeksLoadHeld() == 0) {
            return Optional.of(decision(snapshot, new Action.StopLoadIncrease(), PLATEAU, LADDER));
        }
        // Held for a week ("o hafta", K-68) and still stalled.
        return Optional.of(decision(snapshot, new Action.Deload(setsFactor), LOAD_HELD_STILL_STALLED, LADDER));
    }

    // A plateau threshold is expert opinion (H3 B5), so ladder calls are MEDIUM; looked at again next week.
    private static Decision decision(Snapshot snapshot, Action action, RuleId rule, Source source) {
        return decision(snapshot, action, List.of(new Reason(rule, source)));
    }

    private static Decision decision(Snapshot snapshot, Action action, List<Reason> reasons) {
        return new Decision(action, reasons, Confidence.MEDIUM, snapshot.today().plusDays(DAYS_PER_WEEK),
                new CopyKey("decision." + action.type().name().toLowerCase(Locale.ROOT) + "." + reasons.getFirst().rule().value()));
    }
}
