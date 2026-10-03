package app.keel.engine;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * "What would change the call" (K-610, L3 Y3, prototype 5.6): the same rules run on example data — never mixed with the
 * call's own (U1: the engine decides, no model; U2: which data would change the call). The example is the call's own
 * Snapshot a week later — the caller passes the plan in force now, not a kept call's — seven more mornings weighed at the
 * latest week's mean, or toward the goal: on a cut by what_if_cut_step_of_loss_cap of the weekly loss cap (never a
 * safety call), on a bulk by what_if_trend_step_margins × flat_margin_kg; the plan kept at on_track_min_ratio or not kept
 * at all (G2 K-60); training answered holding or dropping. Everything else is the snapshot's own. A state declared that
 * week is not carried into an example week.
 */
public final class WhatIf {

    /** Next week's trend: toward the goal, or flat. */
    public enum Trend { TOWARD_GOAL, FLAT }

    /** The plan next week: kept (on_track_min_ratio), or not kept at all (under adherence_fix_below: the plan-missed rule). */
    public enum Adherence { ON_TRACK, UNDER }

    /** Training next week, as the check-in asks it: holding, or dropping. */
    public enum Training { HOLDING, DROPPING }

    public record When(Trend trend, Adherence adherence, Training training) {
    }

    public record Scenario(When when, Decision decision) {
    }

    private static final int DAYS_PER_WEEK = 7;

    private WhatIf() {
    }

    /** Every combination of next week, each run through the pipeline: deterministic, in a fixed order. */
    public static List<Scenario> scenarios(Snapshot call, Parameters parameters) {
        List<Scenario> scenarios = new ArrayList<>();
        for (Trend trend : Trend.values()) {
            for (Adherence adherence : Adherence.values()) {
                for (Training training : Training.values()) {
                    When when = new When(trend, adherence, training);
                    scenarios.add(new Scenario(when, DecisionPipeline.decide(example(call, when, parameters), parameters)));
                }
            }
        }
        return List.copyOf(scenarios);
    }

    /** The example week after the call: a Snapshot of its own; the call's is not changed. */
    public static Snapshot example(Snapshot call, When when, Parameters parameters) {
        LocalDate today = call.today().plusDays(DAYS_PER_WEEK);
        List<WeighIn> weighIns = new ArrayList<>(call.weights().weighIns());
        latest(call, parameters).ifPresent(kg -> {
            BigDecimal next = when.trend() == Trend.FLAT ? kg : towardGoal(kg, call.phase(), parameters);
            for (int day = 1; day <= DAYS_PER_WEEK; day++) {
                weighIns.add(new WeighIn(call.today().plusDays(day), next));
            }
        });
        BigDecimal adherence = when.adherence() == Adherence.ON_TRACK ? BigDecimal.valueOf(parameters.number(ParameterKey.ON_TRACK_MIN_RATIO))
                : BigDecimal.ZERO;
        CheckIn checkIn = call.checkIn().withAdherence(adherence)
                .withTraining(when.training() == Training.HOLDING ? CheckIn.Training.STABLE : CheckIn.Training.DECLINING);
        return new Snapshot(today, call.sex(), call.phase(), call.planStart(), new WeightSeries(weighIns), call.fatProxyPct(), call.energy(),
                call.menstrualLossReported(), checkIn, call.profile(), call.observingMaintenance(), call.phaseStart(), call.training(),
                call.fatProxyHighPct(), call.safetyHold(), call.cycleResolved(), call.miniCutUntil(), call.fatProxyEnergyPct(), Optional.empty());
    }

    // The latest week's mean the call read; without one, its last weigh-in; none without any.
    private static Optional<BigDecimal> latest(Snapshot call, Parameters parameters) {
        List<WeeklySpine.WeekMean> weeks = WeeklySpine.windowMeans(call.weights(), call.today(), parameters);
        return weeks.getLast().kg().or(() -> call.weights().weighIns().stream().reduce((a, b) -> b).map(WeighIn::kg));
    }

    private static BigDecimal towardGoal(BigDecimal kg, Phase phase, Parameters parameters) {
        if (phase == Phase.CUT) {
            // A share of the weekly loss cap (G2 K-17 with H3 B3's percentage), so an example never trips the safety net.
            BigDecimal cap = BigDecimal.valueOf(parameters.number(ParameterKey.WEEKLY_LOSS_CAP_KG))
                    .min(kg.multiply(BigDecimal.valueOf(parameters.number(ParameterKey.WEEKLY_LOSS_CAP_PCT_BODYWEIGHT))));
            return kg.subtract(cap.multiply(BigDecimal.valueOf(parameters.number(ParameterKey.WHAT_IF_CUT_STEP_OF_LOSS_CAP))));
        }
        return kg.add(BigDecimal.valueOf(parameters.number(ParameterKey.FLAT_MARGIN_KG))
                .multiply(BigDecimal.valueOf(parameters.number(ParameterKey.WHAT_IF_TREND_STEP_MARGINS))));
    }
}
