package app.keel.engine;

import app.keel.engine.CheckIn.Look;
import app.keel.engine.CheckIn.Recovery;
import app.keel.engine.CheckIn.Training;
import app.keel.engine.CheckIn.Waist;
import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * The coaching weekly check-in tree (03 §2.4, told as "the algorithm" on 2024-08-19):
 *
 * <pre>
 * Weight moving toward the goal?
 * ├─ no  → adherence under adherence_fix_below → fix adherence; under on_track_min_ratio → fix adherence, softer
 * │        (G2 K-60, ADR-020 L-6/L-9) → cut: training declining → fix training, no calorie cut (G7 K-98)
 * │        → held for only one week, or moved the week before (cut, waist not up; ADR-027 #0) / under
 * │          bulk_stall_weeks (bulk) → wait (G2 K-64, G3 K-10)
 * │        → calories toward the goal (cut down, bulk up; the amount is K-107's)
 * └─ yes → looks better, the same or not photographed → continue
 *          looks worse → training declining → fix training
 *                        → recovery poor → fix recovery
 *                        → plan followed (as above) → genetic limit → pull calories back (bulk down, cut up; L-5)
 * </pre>
 *
 * <p>"Toward the goal" compares the mean of the decision window's first week with its last (21 days for men, 28 for
 * women, J1 D1): the change must beat flat_margin_kg in the goal direction (ADR-020 L-10), so about 0.3 kg a week or
 * more is movement. A flat 21-day window already means about two flat weeks, so a single flat week after a clear drop
 * still reads as moving — K-64 by construction (ADR-021). A branch that needs a signal the check-in did not give asks
 * for exactly that signal instead of guessing (U3).
 */
public final class WeeklySpine {

    static final RuleId TOWARD_GOAL = new RuleId("toward_goal");
    static final RuleId NOT_TOWARD_GOAL = new RuleId("not_toward_goal");
    static final RuleId STALL_WINDOW = new RuleId("stall_window");
    static final RuleId BULK_STALL = new RuleId("bulk_stall");
    static final RuleId WAIT_ONE_MORE_WEEK = new RuleId("wait_one_more_week");
    static final RuleId ADHERENCE_LOW = new RuleId("adherence_low");
    static final RuleId ADHERENCE_PARTIAL = new RuleId("adherence_partial");
    static final RuleId PERFORMANCE_RED_FLAG = new RuleId("performance_red_flag");
    static final RuleId TRAINING_FIRST = new RuleId("training_first");
    static final RuleId RECOVERY_POOR = new RuleId("recovery_poor");
    static final RuleId GENETIC_LIMIT = new RuleId("genetic_limit");
    static final RuleId CHECK_IN_NEEDED_TRAINING = new RuleId("check_in_needed_training");
    static final RuleId CHECK_IN_NEEDED_RECOVERY = new RuleId("check_in_needed_recovery");
    static final RuleId CHECK_IN_NEEDED_ADHERENCE = new RuleId("check_in_needed_adherence");

    private static final Source TREE = new Source("arastirma/03-guray-karar-omurgasi.md#2.4", SourceTag.EXPERIENCE);
    private static final Source ADHERENCE = new Source("arastirma/ham/guray/G2-kilo-verme.md#K-60", SourceTag.EXPERIENCE);
    private static final Source ONE_FLAT_WEEK = new Source("arastirma/ham/guray/G2-kilo-verme.md#K-64", SourceTag.EXPERIENCE);
    private static final Source BULK_STEP = new Source("arastirma/ham/guray/G3-kilo-alma-beslenme.md#K-10", SourceTag.EXPERIENCE);
    private static final Source TRAINING_IS_THE_GAUGE = new Source("arastirma/ham/guray/G7-whisper-arsiv.md#K-98", SourceTag.EXPERIENCE);
    private static final Source HOW_LONG_FLAT = new Source("arastirma/ham/H3-bosluk-literatur.md#B3", SourceTag.LITERATURE);

    private static final int DAYS_PER_WEEK = 7;

    private WeeklySpine() {
    }

    public static SpineResult evaluate(Snapshot snapshot, Parameters parameters) {
        Optional<Decision> notEnoughData = DataSufficiency.check(snapshot, parameters);
        if (notEnoughData.isPresent()) {
            return new SpineResult.Decided(notEnoughData.get());
        }
        Window window = Window.of(snapshot, parameters);
        // Toward the goal over the window — or, on a cut the window cannot tell from flat, moving this week (ADR-027 #0).
        boolean moving = window.towardGoal(window.first()) > 0 || (window.cut() && !window.wrongWay() && window.movingThisWeek());
        return moving ? towardGoal(snapshot, parameters) : notTowardGoal(snapshot, window, parameters);
    }

    private static SpineResult towardGoal(Snapshot snapshot, Parameters parameters) {
        CheckIn checkIn = snapshot.checkIn();
        // "Looks better?" — yes → continue. SAME and "no photo this week" continue too: nothing says the plan needs
        // help, and continuing changes nothing (ADR-021, open question for the product owner).
        if (checkIn.look() != Look.WORSE) {
            return decided(snapshot, new Action.Continue(), TOWARD_GOAL, TREE);
        }
        if (checkIn.training() == Training.UNKNOWN) {
            return checkInNeeded(snapshot, CHECK_IN_NEEDED_TRAINING);
        }
        if (checkIn.training() == Training.DECLINING) {
            return decided(snapshot, new Action.FixTraining(), TRAINING_FIRST, TREE);
        }
        if (checkIn.recovery() == Recovery.UNKNOWN) {
            return checkInNeeded(snapshot, CHECK_IN_NEEDED_RECOVERY);
        }
        if (checkIn.recovery() == Recovery.POOR) {
            return decided(snapshot, new Action.FixRecovery(), RECOVERY_POOR, TREE);
        }
        // Moving, training and recovery fine, still looking worse: the genetic limit for this pace. Pull calories back
        // toward maintenance — a smaller surplus on a bulk, a smaller deficit on a cut (ADR-020 L-5). Calories move only
        // on a plan that was followed (G2 K-60).
        Optional<SpineResult> planNotFollowed = adherenceGate(snapshot, parameters);
        if (planNotFollowed.isPresent()) {
            return planNotFollowed.get();
        }
        CalorieDirection back = snapshot.phase() == Phase.BULK ? CalorieDirection.DOWN : CalorieDirection.UP;
        return new SpineResult.CaloriesNeeded(back, List.of(new Reason(GENETIC_LIMIT, TREE)));
    }

    private static SpineResult notTowardGoal(Snapshot snapshot, Window window, Parameters parameters) {
        CheckIn checkIn = snapshot.checkIn();
        Optional<SpineResult> planNotFollowed = adherenceGate(snapshot, parameters);
        if (planNotFollowed.isPresent()) {
            return planNotFollowed.get();
        }
        boolean cut = snapshot.phase() == Phase.CUT;
        // K-98 and the G2 decision table's red flag are cut rules: there, training (not the scale) says whether calories
        // may go down. A stalled bulk goes up whatever training says (G3 K-10 sets no condition).
        if (cut && checkIn.training() == Training.UNKNOWN) {
            return checkInNeeded(snapshot, CHECK_IN_NEEDED_TRAINING);
        }
        if (cut && checkIn.training() == Training.DECLINING) {
            return decided(snapshot, new Action.FixTraining(), PERFORMANCE_RED_FLAG, TRAINING_IS_THE_GAUGE);
        }
        // One flat week is not a plateau (G2 K-64, cut: weight and waist flat); a bulk waits until bulk_stall_weeks
        // without gain (G3 K-10). Going the wrong way is not a pause and does not wait.
        boolean waistAgainst = cut && checkIn.waist() == Waist.UP;
        // A cut that moved the week before this one waits too, however slowly it was losing (ADR-027 #0): within the
        // margin a 0.5 kg-a-week loser looks flat for two weeks, and one flat week is not a plateau.
        boolean stillEarly = cut ? window.flatWeeks() <= parameters.wholeNumber(ParameterKey.FLAT_WAIT_WEEKS) || window.movedLastWeek()
                : window.flatWeeks() < parameters.wholeNumber(ParameterKey.BULK_STALL_WEEKS);
        if (!window.wrongWay() && !waistAgainst && stillEarly) {
            return decided(snapshot, new Action.NoDecisionYet(), WAIT_ONE_MORE_WEEK, cut ? ONE_FLAT_WEEK : BULK_STEP);
        }
        return new SpineResult.CaloriesNeeded(cut ? CalorieDirection.DOWN : CalorieDirection.UP,
                List.of(new Reason(NOT_TOWARD_GOAL, TREE), cut ? new Reason(STALL_WINDOW, HOW_LONG_FLAT) : new Reason(BULK_STALL, BULK_STEP)));
    }

    /**
     * G2 K-60: under adherence_fix_below adherence is the problem; under on_track_min_ratio the plan has not had a
     * fair try (ADR-020 L-9). Either way calories stay. Empty when calories may move.
     */
    private static Optional<SpineResult> adherenceGate(Snapshot snapshot, Parameters parameters) {
        Optional<BigDecimal> adherence = snapshot.checkIn().adherence();
        if (adherence.isEmpty()) {
            return Optional.of(checkInNeeded(snapshot, CHECK_IN_NEEDED_ADHERENCE));
        }
        if (adherence.get().compareTo(line(ParameterKey.ADHERENCE_FIX_BELOW, parameters)) < 0) {
            return Optional.of(decided(snapshot, new Action.FixAdherence(), ADHERENCE_LOW, ADHERENCE));
        }
        if (adherence.get().compareTo(line(ParameterKey.ON_TRACK_MIN_RATIO, parameters)) < 0) {
            return Optional.of(decided(snapshot, new Action.FixAdherence(), ADHERENCE_PARTIAL, ADHERENCE));
        }
        return Optional.empty();
    }

    /** A week of the decision window: its last day, and the mean of its weigh-ins — none without one. */
    public record WeekMean(LocalDate ends, Optional<BigDecimal> kg) {
    }

    /**
     * The decision window's weeks, oldest first, the latest ending on {@code today} (21 days → 3 weeks for men, 28 → 4 for
     * women; J1 D1): what the spine reads, and what "Why this call" shows (K-519).
     */
    public static List<WeekMean> windowMeans(WeightSeries weights, LocalDate today, Parameters parameters) {
        int weekCount = parameters.wholeNumber(ParameterKey.DECISION_WINDOW_DAYS) / DAYS_PER_WEEK;
        List<WeekMean> weeks = new ArrayList<>();
        for (int week = weekCount - 1; week >= 0; week--) {
            LocalDate weekEnd = today.minusDays((long) week * DAYS_PER_WEEK);
            List<WeighIn> weighIns = weights.between(weekEnd.minusDays(DAYS_PER_WEEK - 1L), weekEnd);
            weeks.add(new WeekMean(weekEnd, weighIns.isEmpty() ? Optional.empty() : Optional.of(weighIns.stream().map(WeighIn::kg)
                    .reduce(BigDecimal.ZERO, BigDecimal::add).divide(BigDecimal.valueOf(weighIns.size()), MathContext.DECIMAL64))));
        }
        return List.copyOf(weeks);
    }

    /**
     * The decision window's weekly means, oldest first (21 days → 3 weeks for men, 28 → 4 for women; J1 D1). The window
     * lies inside the current plan and every week has weigh-ins (DataSufficiency ran first), so the previous plan's
     * movement never counts. Two weekly means that differ by no more than flat_margin_kg are the same weight within
     * noise (ADR-020 L-10).
     */
    private record Window(List<BigDecimal> weeks, BigDecimal margin, boolean cut) {

        static Window of(Snapshot snapshot, Parameters parameters) {
            List<BigDecimal> means = windowMeans(snapshot.weights(), snapshot.today(), parameters).stream()
                    .map(week -> week.kg().orElseThrow(() -> new IllegalStateException("A week of the window has no weigh-in"))).toList();
            return new Window(means, line(ParameterKey.FLAT_MARGIN_KG, parameters), snapshot.phase() == Phase.CUT);
        }

        BigDecimal first() {
            return weeks.getFirst();
        }

        BigDecimal latest() {
            return weeks.getLast();
        }

        /** How far the weight went from {@code from} to the latest week toward the goal, beyond the noise margin. */
        int towardGoal(BigDecimal from) {
            BigDecimal moved = cut ? from.subtract(latest()) : latest().subtract(from);
            return moved.compareTo(margin) > 0 ? 1 : moved.negate().compareTo(margin) > 0 ? -1 : 0;
        }

        /** Away from the goal over the window, or this week: not a pause. */
        boolean wrongWay() {
            return towardGoal(first()) < 0 || towardGoal(weeks.get(weeks.size() - 2)) < 0;
        }

        /**
         * This week's step reached the per-week share of the margin (the margin split over the window's weekly steps:
         * 0.29 kg for a man's 3 weeks, 0.19 for a woman's 4 — a proportional split, not a test of its own: one step is as
         * noisy as the whole window, so a step alone only delays a plateau call, never makes one), not by undoing a rise
         * the week before, and the window as a whole went toward the goal: a steady slow loser is moving, not stalled
         * (ADR-027 #0).
         */
        boolean movingThisWeek() {
            int n = weeks.size();
            return n >= 3 && step(weeks.get(n - 2), latest()).compareTo(perWeek()) >= 0 && step(weeks.get(n - 3), weeks.get(n - 2)).signum() >= 0
                    && step(first(), latest()).signum() > 0;
        }

        /** The step before this week's reached the per-week share: this week is the first flat one (G2 K-64). */
        boolean movedLastWeek() {
            int n = weeks.size();
            return n >= 3 && step(weeks.get(n - 3), weeks.get(n - 2)).compareTo(perWeek()) >= 0;
        }

        private BigDecimal perWeek() {
            return margin.divide(BigDecimal.valueOf(weeks.size() - 1L), MathContext.DECIMAL64);
        }

        // How far the weight went toward the goal from one weekly mean to the next.
        private BigDecimal step(BigDecimal from, BigDecimal to) {
            return cut ? from.subtract(to) : to.subtract(from);
        }

        /** Weeks right before the latest that are the same weight as it within noise: 1 = held for one week. */
        int flatWeeks() {
            int flat = 0;
            for (int week = weeks.size() - 2; week >= 0 && weeks.get(week).subtract(latest()).abs().compareTo(margin) <= 0; week--) {
                flat++;
            }
            return flat;
        }
    }

    private static BigDecimal line(ParameterKey key, Parameters parameters) {
        return BigDecimal.valueOf(parameters.number(key));
    }

    /** A check-in answer the spine can be missing; adherence is not one — it is counted from the logs (ADR-020 L-6). */
    public enum Missing { TRAINING, RECOVERY }

    /** The answer this decision waits for, if it is a "not yet: tell me …" (K-213 asks exactly that). */
    public static java.util.Optional<Missing> missingAnswer(Decision decision) {
        if (!(decision.action() instanceof Action.NoDecisionYet)) {
            return java.util.Optional.empty();
        }
        RuleId rule = decision.reasons().getFirst().rule();
        if (rule.equals(CHECK_IN_NEEDED_TRAINING)) {
            return java.util.Optional.of(Missing.TRAINING);
        }
        return rule.equals(CHECK_IN_NEEDED_RECOVERY) ? java.util.Optional.of(Missing.RECOVERY) : java.util.Optional.empty();
    }

    /** No decision yet, naming the missing answer so the app can ask exactly that (U2, U3). */
    private static SpineResult checkInNeeded(Snapshot snapshot, RuleId missing) {
        return decided(snapshot, new Action.NoDecisionYet(), missing, TREE);
    }

    // Spine calls are looked at again at the next weekly check-in. Confidence is MEDIUM here; the assembly (K-112)
    // derives the final level from data density and window fill.
    private static SpineResult decided(Snapshot snapshot, Action action, RuleId rule, Source source) {
        return new SpineResult.Decided(new Decision(action, List.of(new Reason(rule, source)), Confidence.MEDIUM,
                snapshot.today().plusDays(DAYS_PER_WEEK),
                new CopyKey("decision." + action.type().name().toLowerCase(Locale.ROOT) + "." + rule.value())));
    }
}
