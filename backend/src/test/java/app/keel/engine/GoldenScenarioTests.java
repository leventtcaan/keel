package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import app.keel.engine.CheckIn.Appetite;
import app.keel.engine.CheckIn.Look;
import app.keel.engine.CheckIn.Recovery;
import app.keel.engine.CheckIn.Training;
import app.keel.engine.CheckIn.Waist;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;
import org.yaml.snakeyaml.Yaml;

/**
 * Golden scenarios (K-113): whole user journeys, week by week, through the assembled engine — the regression proof that
 * the engine behaves as a whole (timing, windows, floors), not only rule by rule. The journeys and their expected
 * decisions are in golden/scenarios.yaml; this harness plays them: every week it builds the Snapshot from the plan so
 * far, asks the engine, and applies the decision to the plan the way the decision module will (K-212).
 */
class GoldenScenarioTests {

    private static final String RESOURCE = "/golden/scenarios.yaml";
    private static final LocalDate DAY_ZERO = LocalDate.of(2026, 9, 7);
    private static final int DAYS_PER_WEEK = 7;

    @TestFactory
    Stream<DynamicTest> everyJourneyGetsItsExpectedDecisionsWeekByWeek() throws IOException {
        return scenarios().stream().map(scenario -> DynamicTest.dynamicTest(
                scenario.get("id") + " · " + scenario.get("title"), () -> play(scenario)));
    }

    @TestFactory
    Stream<DynamicTest> thereAreEnoughJourneysAndEveryOneIsLongerThanItsObservation() throws IOException {
        List<Map<String, Object>> scenarios = scenarios();
        return Stream.of(DynamicTest.dynamicTest("at least 20 journeys (K-113)", () -> assertThat(scenarios).hasSizeGreaterThanOrEqualTo(20)),
                DynamicTest.dynamicTest("every journey expects one decision per week", () -> scenarios.forEach(scenario ->
                        assertThat(list(scenario, "expect")).as((String) scenario.get("id")).hasSameSizeAs(list(scenario, "weeks")))),
                DynamicTest.dynamicTest("weigh-ins spread over the week, always on the check-in morning", () -> {
                    assertThat(weighInDays(7)).containsExactly(0, 1, 2, 3, 4, 5, 6);
                    assertThat(weighInDays(6)).containsExactly(1, 2, 3, 4, 5, 6);
                    assertThat(weighInDays(2)).containsExactly(3, 6);
                    assertThat(weighInDays(0)).isEmpty();
                    assertThatIllegalArgumentException().isThrownBy(() -> weighInDays(8));
                }));
    }

    /** The plan as the decision module would keep it between check-ins. */
    private static final class Plan {
        Phase phase;
        LocalDate phaseStart;
        LocalDate planStart = DAY_ZERO;
        int targetKcal;
        boolean observing = true; // the starting estimate is being observed until a new plan replaces it
    }

    @SuppressWarnings("unchecked")
    private static void play(Map<String, Object> scenario) {
        Map<String, Object> user = (Map<String, Object>) scenario.get("user");
        Sex sex = Sex.valueOf(text(user, "sex").toUpperCase(Locale.ROOT));
        Parameters parameters = parameters(sex);
        Profile profile = new Profile(number(user, "age", 30), number(user, "height", sex == Sex.MALE ? 180 : 165));
        List<Object> weeks = list(scenario, "weeks");
        List<Object> expected = list(scenario, "expect");
        Map<String, Object> defaults = (Map<String, Object>) scenario.getOrDefault("checkin", Map.of());
        Map<Object, Object> overrides = (Map<Object, Object>) scenario.getOrDefault("overrides", Map.of());
        int mornings = number(scenario, "mornings", DAYS_PER_WEEK);

        Plan plan = new Plan();
        plan.phase = Phase.valueOf(text(user, "phase").toUpperCase(Locale.ROOT));
        plan.phaseStart = DAY_ZERO.minusMonths(number(user, "bulk_months_before", 0));
        Optional<ActivityLevel> activity = Optional.ofNullable((String) user.get("activity"))
                .map(level -> ActivityLevel.valueOf(level.toUpperCase(Locale.ROOT)));
        plan.targetKcal = InitialTarget.estimate(sex, decimal(weeks.getFirst()), profile, activity, parameters).maintenanceKcal();

        List<WeighIn> weighIns = new ArrayList<>();
        List<String> actual = new ArrayList<>();
        List<String> wanted = new ArrayList<>();
        for (int week = 1; week <= weeks.size(); week++) {
            LocalDate first = DAY_ZERO.plusDays((long) DAYS_PER_WEEK * (week - 1));
            Map<String, Object> answers = new HashMap<>(defaults);
            answers.putAll((Map<String, Object>) overrides.getOrDefault(week, Map.of()));
            for (int day : weighInDays(number(answers, "mornings", mornings))) {
                weighIns.add(new WeighIn(first.plusDays(day), decimal(weeks.get(week - 1))));
            }
            LocalDate today = first.plusDays(DAYS_PER_WEEK - 1L);

            Snapshot snapshot = snapshot(today, sex, plan, weighIns, user, profile, answers);
            Decision decision = DecisionPipeline.decide(snapshot, parameters);
            Expectation expectation = Expectation.of(expected.get(week - 1));
            wanted.add(expectation.toString());
            actual.add(expectation.describe(decision, today));
            apply(decision, plan, today);
        }

        assertThat(actual).as("%s, week by week", scenario.get("id")).containsExactlyElementsOf(wanted);
    }

    /**
     * The days of a week (0 = Monday … 6 = the check-in day) a user who weighs in {@code mornings} times weighs in:
     * spread over the week, always on the check-in morning. 0 is a week without a weigh-in.
     */
    static List<Integer> weighInDays(int mornings) {
        if (mornings < 0 || mornings > DAYS_PER_WEEK) {
            throw new IllegalArgumentException("A week has 0 to 7 weigh-ins, the scenario says " + mornings);
        }
        List<Integer> days = new ArrayList<>();
        for (int i = mornings - 1; i >= 0; i--) {
            days.add(DAYS_PER_WEEK - 1 - i * DAYS_PER_WEEK / mornings);
        }
        return days;
    }

    /**
     * One week's expected decision: the shorthand, and optionally the review day it promises ({@code next}, days after
     * the check-in) and its confidence. Only what the scenario states is compared.
     */
    private record Expectation(String decision, Optional<Integer> next, Optional<Confidence> confidence) {

        @SuppressWarnings("unchecked")
        static Expectation of(Object entry) {
            if (!(entry instanceof Map<?, ?> map)) {
                return new Expectation(entry.toString(), Optional.empty(), Optional.empty());
            }
            Map<String, Object> fields = (Map<String, Object>) map;
            return new Expectation(fields.get("is").toString(),
                    Optional.ofNullable((Integer) fields.get("next")),
                    Optional.ofNullable((String) fields.get("confidence")).map(level -> Confidence.valueOf(level.toUpperCase(Locale.ROOT))));
        }

        String describe(Decision decision, LocalDate today) {
            return new Expectation(shorthand(decision),
                    next.map(_ -> (int) ChronoUnit.DAYS.between(today, decision.nextReview())),
                    confidence.map(_ -> decision.confidence())).toString();
        }

        @Override
        public String toString() {
            return decision + next.map(days -> " next " + days).orElse("") + confidence.map(level -> " " + level).orElse("");
        }
    }

    private static Snapshot snapshot(LocalDate today, Sex sex, Plan plan, List<WeighIn> weighIns, Map<String, Object> user,
            Profile profile, Map<String, Object> answers) {
        Optional<BigDecimal> fat = Optional.ofNullable(user.get("fat_proxy_pct")).map(GoldenScenarioTests::decimal);
        Snapshot snapshot = new Snapshot(today, sex, plan.phase, plan.planStart, new WeightSeries(List.copyOf(weighIns)), fat)
                .withEnergy(new EnergyBudget(plan.targetKcal, number(user, "exercise_kcal", 300)))
                .withProfile(profile)
                .withObservingMaintenance(plan.observing)
                .withPhaseStart(plan.phaseStart.isAfter(plan.planStart) ? plan.planStart : plan.phaseStart)
                .withMenstrualLossReported(Boolean.TRUE.equals(answers.get("menstrual_loss_reported")))
                .withCheckIn(checkIn(answers));
        return training(answers).map(snapshot::withTraining).orElse(snapshot);
    }

    private static CheckIn checkIn(Map<String, Object> answers) {
        CheckIn checkIn = CheckIn.NONE.withTraining(Training.valueOf(answers.getOrDefault("training", "stable").toString().toUpperCase(Locale.ROOT)));
        // `adherence: ~` is a check-in without the adherence answer.
        if (!answers.containsKey("adherence") || answers.get("adherence") != null) {
            checkIn = checkIn.withAdherence(decimal(answers.getOrDefault("adherence", "0.9")));
        }
        if (answers.get("waist") instanceof String waist) {
            checkIn = checkIn.withWaist(Waist.valueOf(waist.toUpperCase(Locale.ROOT)));
        }
        if (answers.get("look") instanceof String look) {
            checkIn = checkIn.withLook(Look.valueOf(look.toUpperCase(Locale.ROOT)));
        }
        if (answers.get("recovery") instanceof String recovery) {
            checkIn = checkIn.withRecovery(Recovery.valueOf(recovery.toUpperCase(Locale.ROOT)));
        }
        if (answers.get("appetite") instanceof String appetite) {
            checkIn = checkIn.withAppetite(Appetite.valueOf(appetite.toUpperCase(Locale.ROOT)));
        }
        return checkIn;
    }

    private static Optional<TrainingStatus> training(Map<String, Object> answers) {
        List<String> keys = List.of("stalled_sessions", "weeks_load_held", "months_stalled", "rested_last_week", "loads_below_last_week",
                "plan_missed_weeks");
        if (keys.stream().noneMatch(answers::containsKey)) {
            return Optional.empty();
        }
        return Optional.of(new TrainingStatus(number(answers, "stalled_sessions", 0), number(answers, "weeks_load_held", 0),
                number(answers, "months_stalled", 0),
                Boolean.TRUE.equals(answers.get("rested_last_week")))
                .withLoadsBelowLastWeek(Boolean.TRUE.equals(answers.get("loads_below_last_week")))
                .withWeeksPlanMissed(number(answers, "plan_missed_weeks", 0)));
    }

    /**
     * What the decision module does with a decision (K-212): a new target starts a new plan tomorrow; a new phase, too,
     * keeping the target — K-212 may set the new phase's first target differently, and then these journeys change.
     * Everything else leaves the plan as it is: continue and "not yet" by definition; the training calls (hold the
     * load, deload, a week off, fix recovery or training, fix adherence) change the week, not the food plan; more
     * movement is asked instead of fewer calories. The hard stop and the mini cut do start a new food plan, whose
     * target K-212 sets (maintenance at least; a 4-6 week deficit) — no journey here plays past one.
     */
    private static void apply(Decision decision, Plan plan, LocalDate today) {
        switch (decision.action()) {
            case Action.AdjustCalories(int kcal) -> newPlan(plan, today, plan.targetKcal + kcal);
            case Action.IncreaseCalories(int kcal) -> newPlan(plan, today, plan.targetKcal + kcal);
            case Action.ChangePhase(Phase to) -> {
                plan.phase = to;
                plan.phaseStart = today.plusDays(1);
                newPlan(plan, today, plan.targetKcal);
            }
            default -> {
            }
        }
    }

    private static void newPlan(Plan plan, LocalDate today, int targetKcal) {
        plan.targetKcal = targetKcal;
        plan.planStart = today.plusDays(1);
        plan.observing = false;
    }

    /** The decision in the scenario's shorthand: a "not yet" by its reason, anything else as action[:kcal]/reason. */
    private static String shorthand(Decision decision) {
        String reason = decision.reasons().getFirst().rule().value();
        return switch (decision.action()) {
            case Action.NoDecisionYet _ -> reason;
            case Action.AdjustCalories(int kcal) -> "adjust_calories:" + kcal + "/" + reason;
            case Action.IncreaseCalories(int kcal) -> "increase_calories:" + kcal + "/" + reason;
            default -> decision.action().type().name().toLowerCase(Locale.ROOT) + "/" + reason;
        };
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> scenarios() throws IOException {
        try (InputStream in = GoldenScenarioTests.class.getResourceAsStream(RESOURCE)) {
            Map<String, Object> document = new Yaml().load(in);
            return (List<Map<String, Object>>) document.get("scenarios");
        }
    }

    @SuppressWarnings("unchecked")
    private static List<Object> list(Map<String, Object> scenario, String key) {
        return (List<Object>) scenario.get(key);
    }

    private static String text(Map<String, Object> map, String key) {
        return map.get(key).toString();
    }

    private static int number(Map<String, Object> map, String key, int fallback) {
        return map.get(key) instanceof Number number ? number.intValue() : fallback;
    }

    private static BigDecimal decimal(Object value) {
        return new BigDecimal(value.toString());
    }
}
