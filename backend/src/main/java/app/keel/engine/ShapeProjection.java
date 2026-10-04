package app.keel.engine;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * The shape projection's numbers (K-613, U12, ADR-050, ADR-052): where the weight goes in projection_horizon_weeks if the
 * plan is kept 60 %, 80 % or 95 % of the time — a behaviour per scenario, never a promised result. Each number is the
 * energy balance model's ({@link EnergyBalanceModel}, ADR-051), started from today's trend weight and settled on the
 * plan (the water already lost is not lost again). The phone only draws it.
 *
 * <ul>
 *   <li><b>When</b>: an adult (projection_min_age), not while the safety net holds the plan (U13), weighed over at least projection_min_span_days (first to last weigh-in),
 *       with a trend weight this week, on a plan that moves toward a goal (a cut under maintenance, a bulk over it). Under
 *       BMI projection_loss_min_bmi the losing direction is closed; gaining stays open (ADR-050).</li>
 *   <li><b>A scenario</b>: keeping the plan a share of the time = eating the plan's calories that share of the days and
 *       maintenance the rest, on average maintenance + share × (target − maintenance).</li>
 *   <li><b>Its range</b> (U5): the model again with maintenance projection_maintenance_uncertainty_kj_per_day lower and
 *       higher (Hall 2011 figure 2A), widened to at least projection_error_floor_kg each side (H12 M8).</li>
 *   <li><b>Only forward</b> (H2 §4.5): the end of a range past today's weight, away from the goal, stops at today's weight
 *       — the number never draws a worse body.</li>
 *   <li><b>Not made</b>: a losing scenario whose first weeks lose more than the engine's weekly cap (safety.yaml, the same
 *       min(kg, % of weight) the plan obeys; H2 §4.3), or whose range reaches under BMI projection_min_bmi. None left: not
 *       shown.</li>
 * </ul>
 */
public final class ShapeProjection {

    // Unit definitions: the thermochemical calorie; a week; centimetres in a metre.
    private static final double KJ_PER_KCAL = 4.184;
    private static final int DAYS_PER_WEEK = 7;
    private static final double CM_PER_M = 100;
    // Display precision: weights to 0.1 kg, like the rest of the app's weights.
    private static final int KG_DECIMALS = 1;

    private ShapeProjection() {
    }

    public enum Direction { LOSS, GAIN }

    public enum Closed { UNDER_AGE, SAFETY_HOLD, TOO_EARLY, NO_RECENT_WEIGHT, NO_DIRECTION, LOW_BMI_LOSS, NO_SAFE_SCENARIO }

    /** What the projection reads: the person, the plan in force, the weigh-ins, and whether the safety net holds the plan. */
    public record Facts(LocalDate today, Sex sex, Profile profile, Optional<ActivityLevel> activity, Phase phase, WeightSeries weights,
            int targetKcal, boolean safetyHold) {
        public Facts {
            Objects.requireNonNull(today, "today");
            Objects.requireNonNull(sex, "sex");
            Objects.requireNonNull(profile, "profile");
            Objects.requireNonNull(activity, "activity");
            Objects.requireNonNull(phase, "phase");
            Objects.requireNonNull(weights, "weights");
        }
    }

    /** One behaviour: the plan kept {@code adherence} of the time, and the weight it leads to — a range around the model's number. */
    public record Scenario(BigDecimal adherence, BigDecimal lowKg, BigDecimal kg, BigDecimal highKg) {
    }

    public sealed interface Projection permits Shown, NotShown {
    }

    public record Shown(BigDecimal todayKg, Direction direction, LocalDate on, List<Scenario> scenarios) implements Projection {
        public Shown {
            scenarios = List.copyOf(scenarios);
        }
    }

    public record NotShown(Closed why) implements Projection {
    }

    public static Projection of(Facts facts, Parameters parameters) {
        if (facts.sex() != parameters.sex()) {
            throw new IllegalArgumentException("parameters are for " + parameters.sex() + ", the person is " + facts.sex());
        }
        if (facts.profile().ageYears() < parameters.wholeNumber(ParameterKey.PROJECTION_MIN_AGE)) {
            return new NotShown(Closed.UNDER_AGE);
        }
        // The safety net runs first (U13): while it holds the plan, no number says where a loss would go.
        if (facts.safetyHold()) {
            return new NotShown(Closed.SAFETY_HOLD);
        }
        Optional<LocalDate> first = facts.weights().firstDay();
        Optional<LocalDate> last = facts.weights().lastDay();
        if (first.isEmpty() || ChronoUnit.DAYS.between(first.get(), last.get()) < parameters.wholeNumber(ParameterKey.PROJECTION_MIN_SPAN_DAYS)) {
            return new NotShown(Closed.TOO_EARLY);
        }
        Optional<BigDecimal> trend = WeightTrend.at(facts.weights(), facts.today(), parameters.wholeNumber(ParameterKey.TREND_DISPLAY_DAYS));
        if (trend.isEmpty()) {
            return new NotShown(Closed.NO_RECENT_WEIGHT);
        }
        double weight = trend.get().doubleValue();
        InitialTarget.Estimate estimate = InitialTarget.estimate(facts.sex(), trend.get(), facts.profile(), facts.activity(), parameters);
        int maintenance = estimate.maintenanceKcal();
        Optional<Direction> direction = direction(facts.phase(), facts.targetKcal(), maintenance);
        if (direction.isEmpty()) {
            return new NotShown(Closed.NO_DIRECTION);
        }
        double heightM = facts.profile().heightCm() / CM_PER_M;
        double bmi = weight / (heightM * heightM);
        if (direction.get() == Direction.LOSS && bmi < parameters.number(ParameterKey.PROJECTION_LOSS_MIN_BMI)) {
            return new NotShown(Closed.LOW_BMI_LOSS);
        }

        Run run = new Run(facts, parameters, weight, estimate.restingKcal(), maintenance, direction.get(), heightM);
        List<Scenario> scenarios = new ArrayList<>();
        for (ParameterKey share : List.of(ParameterKey.PROJECTION_ADHERENCE_LOW, ParameterKey.PROJECTION_ADHERENCE_MID,
                ParameterKey.PROJECTION_ADHERENCE_HIGH)) {
            run.scenario(BigDecimal.valueOf(parameters.number(share))).ifPresent(scenarios::add);
        }
        if (scenarios.isEmpty()) {
            return new NotShown(Closed.NO_SAFE_SCENARIO);
        }
        return new Shown(kg(weight), direction.get(), facts.today().plusWeeks(parameters.wholeNumber(ParameterKey.PROJECTION_HORIZON_WEEKS)),
                scenarios);
    }

    /** A cut under maintenance loses, a bulk over it gains; anything else has nowhere to go. */
    private static Optional<Direction> direction(Phase phase, int targetKcal, int maintenanceKcal) {
        return switch (phase) {
            case CUT -> targetKcal < maintenanceKcal ? Optional.of(Direction.LOSS) : Optional.empty();
            case BULK -> targetKcal > maintenanceKcal ? Optional.of(Direction.GAIN) : Optional.empty();
        };
    }

    /** The model runs for one person and plan. */
    private record Run(Facts facts, Parameters parameters, double weight, int resting, int maintenance, Direction direction, double heightM) {

        Optional<Scenario> scenario(BigDecimal share) {
            int days = parameters.wholeNumber(ParameterKey.PROJECTION_HORIZON_WEEKS) * DAYS_PER_WEEK;
            double intake = maintenance + share.doubleValue() * (facts.targetKcal() - maintenance);
            double[] point = weights(maintenance, intake, days);
            if (direction == Direction.LOSS && fasterThanTheCap(point)) {
                return Optional.empty();
            }

            // The range: true maintenance lower and higher by the model's own uncertainty (eating the same food), then the floor.
            double uncertainty = parameters.number(ParameterKey.PROJECTION_MAINTENANCE_UNCERTAINTY_KJ_PER_DAY) / KJ_PER_KCAL;
            double lowerMaintenance = Math.max(maintenance - uncertainty, lowestMaintenance());
            double atLower = weights(lowerMaintenance, intake, days)[days];
            double atHigher = weights(maintenance + uncertainty, intake, days)[days];
            double end = point[days];
            double floor = parameters.number(ParameterKey.PROJECTION_ERROR_FLOOR_KG);
            double low = Math.min(Math.min(atLower, atHigher), end - floor);
            double high = Math.max(Math.max(atLower, atHigher), end + floor);
            // Only forward (H2 §4.5): the end past today's weight, away from the goal, stops at today's weight.
            if (direction == Direction.LOSS) {
                high = Math.min(high, weight);
                if (low < parameters.number(ParameterKey.PROJECTION_MIN_BMI) * heightM * heightM) {
                    return Optional.empty();
                }
            } else {
                low = Math.max(low, weight);
            }
            return Optional.of(new Scenario(share, kg(low), kg(end), kg(high)));
        }

        /** The person with this maintenance, settled on the plan's calories (ADR-051 §4), eating {@code intake} from today. */
        private double[] weights(double maintenanceKcal, double intake, int days) {
            EnergyBalanceModel.Start start = new EnergyBalanceModel.Start(facts.sex(), facts.profile(), weight, resting, maintenanceKcal);
            return EnergyBalanceModel.weightsKg(start, facts.targetKcal(), day -> intake, days, parameters);
        }

        /** The lowest maintenance the model runs on: under it its physical activity term turns negative (H12 M5). */
        private double lowestMaintenance() {
            return resting / (1 - parameters.number(ParameterKey.ENERGY_MODEL_THERMIC_EFFECT_RATIO));
        }

        /** Any week losing more than the plan's own weekly cap: min(kg, share of that week's starting weight). */
        private boolean fasterThanTheCap(double[] trajectory) {
            double capKg = parameters.number(ParameterKey.WEEKLY_LOSS_CAP_KG);
            double capShare = parameters.number(ParameterKey.WEEKLY_LOSS_CAP_PCT_BODYWEIGHT);
            for (int day = DAYS_PER_WEEK; day < trajectory.length; day++) {
                double weekStart = trajectory[day - DAYS_PER_WEEK];
                if (weekStart - trajectory[day] > Math.min(capKg, capShare * weekStart)) {
                    return true;
                }
            }
            return false;
        }
    }

    private static BigDecimal kg(double value) {
        return BigDecimal.valueOf(value).setScale(KG_DECIMALS, RoundingMode.HALF_EVEN);
    }
}
