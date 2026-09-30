package app.keel.engine;

import app.keel.engine.CheckIn.Appetite;
import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * The mini cut (G7 K-102, spec WC-20): after mini_cut_after_bulk_months of bulk, when appetite is gone — the user can't
 * even eat what they used to and forces food down — a deficit of mini_cut_weeks_min to mini_cut_weeks_max weeks. The
 * first weeks bring no hunger; by week 3-4 appetite returns and the fat the bulk added is gone: an appetite reset.
 */
public final class MiniCutGate {

    static final RuleId APPETITE_GONE = new RuleId("appetite_gone");
    public static final RuleId MINI_CUT_OVER = new RuleId("mini_cut_over");
    public static final RuleId MINI_CUT_RUNNING = new RuleId("mini_cut_running");
    private static final Source MINI_CUT = new Source("arastirma/ham/guray/G7-whisper-arsiv.md#K-102", SourceTag.EXPERIENCE);

    private static final int DAYS_PER_WEEK = 7;

    private MiniCutGate() {
    }

    public static Optional<Decision> check(Snapshot snapshot, Parameters parameters) {
        boolean longBulk = !snapshot.today().isBefore(
                snapshot.phaseStart().plusMonths(parameters.wholeNumber(ParameterKey.MINI_CUT_AFTER_BULK_MONTHS)));
        if (snapshot.phase() != Phase.BULK || snapshot.checkIn().appetite() != Appetite.GONE || !longBulk) {
            return Optional.empty();
        }
        Action action = new Action.MiniCut(parameters.wholeNumber(ParameterKey.MINI_CUT_WEEKS_MIN),
                parameters.wholeNumber(ParameterKey.MINI_CUT_WEEKS_MAX));
        // The user's own report plus a long bulk: an experience rule without a measured threshold, so MEDIUM.
        // Looked at again when the shortest mini cut is over (K-102: the first weeks bring no hunger).
        return Optional.of(new Decision(action, List.of(new Reason(APPETITE_GONE, MINI_CUT)), Confidence.MEDIUM,
                snapshot.today().plusWeeks(parameters.wholeNumber(ParameterKey.MINI_CUT_WEEKS_MIN)),
                new CopyKey("decision." + action.type().name().toLowerCase(Locale.ROOT) + "." + APPETITE_GONE.value())));
    }

    /**
     * The mini cut's day has come (K-227): the plan goes back to building. Before anything that could wait — a plan still
     * watched, a short window — since the mini cut was set for so many weeks, not until the data says so.
     */
    public static Optional<Decision> over(Snapshot snapshot, Parameters parameters) {
        if (snapshot.phase() != Phase.CUT || snapshot.miniCutUntil().filter(until -> !snapshot.today().isBefore(until)).isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(new Decision(new Action.ChangePhase(Phase.BULK), List.of(new Reason(MINI_CUT_OVER, MINI_CUT)), Confidence.MEDIUM,
                snapshot.today().plusDays(parameters.wholeNumber(ParameterKey.DECISION_WINDOW_DAYS)),
                new CopyKey("decision.change_phase." + MINI_CUT_OVER.value())));
    }

    /**
     * While the mini cut runs (ADR-030 #32): the weekly spine's calorie steps wait for its day, up or down — G7 K-102 sets
     * weeks of deficit, not a deeper one. The safety net still runs before this; the day itself is {@link #over}.
     */
    public static Optional<Decision> running(Snapshot snapshot) {
        if (snapshot.phase() != Phase.CUT || snapshot.miniCutUntil().filter(until -> snapshot.today().isBefore(until)).isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(new Decision(new Action.Continue(), List.of(new Reason(MINI_CUT_RUNNING, MINI_CUT)), Confidence.MEDIUM,
                snapshot.today().plusDays(DAYS_PER_WEEK), new CopyKey("decision.continue." + MINI_CUT_RUNNING.value())));
    }

    /**
     * The mini cut's daily target: one minimum cut step under maintenance (G7 K-97, K-102) — under a floor a calorie step
     * down would not go under (the low-energy floor, resting energy, the macro floors; CalorieLadder), or for a woman
     * without a fat estimate (ADR-027 #11b), maintenance: the bulk's surplus ends, no deficit is opened. The floors need
     * the profile, a weight trend and the plan's energy (the low-energy floor adds its exercise burn); without them,
     * maintenance.
     */
    public static int target(Snapshot snapshot, int maintenanceKcal, Parameters parameters) {
        int proposed = maintenanceKcal - parameters.wholeNumber(ParameterKey.CUT_STEP_MIN_KCAL);
        Optional<BigDecimal> weight = WeightTrend.at(snapshot.weights(), snapshot.today(), parameters.wholeNumber(ParameterKey.TREND_DISPLAY_DAYS));
        if (snapshot.profile().isEmpty() || weight.isEmpty() || snapshot.energy().isEmpty()
                || snapshot.sex() == Sex.FEMALE && snapshot.fatProxyPct().isEmpty()) {
            return maintenanceKcal;
        }
        int bmr = InitialTarget.restingKcal(snapshot.sex(), weight.get(), snapshot.profile().get(), parameters);
        return CalorieLadder.floor(proposed, snapshot, bmr, parameters).isPresent() ? maintenanceKcal : proposed;
    }
}
