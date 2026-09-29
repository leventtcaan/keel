package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.CheckIn.Appetite;
import app.keel.engine.CheckIn.Look;
import app.keel.engine.CheckIn.Recovery;
import app.keel.engine.CheckIn.Training;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
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
                        assertThat(list(scenario, "expect")).as((String) scenario.get("id")).hasSameSizeAs(list(scenario, "weeks")))));
    }

    /** The plan as the decision module would keep it between check-ins. */
    private static final class Plan {
        Phase phase;
        LocalDate phaseStart;
        LocalDate planStart = DAY_ZERO;
        int targetKcal;
        boolean observing = true;
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
        for (int week = 1; week <= weeks.size(); week++) {
            LocalDate first = DAY_ZERO.plusDays((long) DAYS_PER_WEEK * (week - 1));
            for (int day = 0; day < DAYS_PER_WEEK; day += DAYS_PER_WEEK / mornings) {
                if (weighIns.stream().filter(w -> !w.date().isBefore(first)).count() < mornings) {
                    weighIns.add(new WeighIn(first.plusDays(day), decimal(weeks.get(week - 1))));
                }
            }
            LocalDate today = first.plusDays(DAYS_PER_WEEK - 1L);
            Map<String, Object> answers = new java.util.HashMap<>(defaults);
            answers.putAll((Map<String, Object>) overrides.getOrDefault(week, Map.of()));

            Snapshot snapshot = snapshot(today, sex, plan, weighIns, user, profile, answers);
            Decision decision = DecisionPipeline.decide(snapshot, parameters);
            actual.add(shorthand(decision, expected.get(week - 1).toString()));
            apply(decision, plan, today);
        }

        assertThat(actual).as("%s, week by week", scenario.get("id"))
                .containsExactlyElementsOf(expected.stream().map(Object::toString).toList());
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
        CheckIn checkIn = CheckIn.NONE.withAdherence(decimal(answers.getOrDefault("adherence", "0.9")))
                .withTraining(Training.valueOf(answers.getOrDefault("training", "stable").toString().toUpperCase(Locale.ROOT)));
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
        List<String> keys = List.of("stalled_sessions", "weeks_load_held", "rested_last_week", "loads_below_last_week", "plan_missed_weeks");
        if (keys.stream().noneMatch(answers::containsKey)) {
            return Optional.empty();
        }
        return Optional.of(new TrainingStatus(number(answers, "stalled_sessions", 0), number(answers, "weeks_load_held", 0), 0,
                Boolean.TRUE.equals(answers.get("rested_last_week")))
                .withLoadsBelowLastWeek(Boolean.TRUE.equals(answers.get("loads_below_last_week")))
                .withWeeksPlanMissed(number(answers, "plan_missed_weeks", 0)));
    }

    /** What the decision module does with a decision: a new target starts a new plan tomorrow; a new phase, too. */
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
                if (!decision.reasons().getFirst().rule().value().equals("observing")) {
                    plan.observing = false; // the starting estimate's observation is over
                }
            }
        }
    }

    private static void newPlan(Plan plan, LocalDate today, int targetKcal) {
        plan.targetKcal = targetKcal;
        plan.planStart = today.plusDays(1);
        plan.observing = false;
    }

    /** The decision in the scenario's shorthand, as detailed as the expectation asks for. */
    private static String shorthand(Decision decision, String expected) {
        String action = decision.action().type().name().toLowerCase(Locale.ROOT);
        String reason = decision.reasons().getFirst().rule().value();
        String base = switch (decision.action()) {
            case Action.NoDecisionYet _ -> reason;
            case Action.AdjustCalories(int kcal) -> action + ":" + kcal;
            case Action.IncreaseCalories(int kcal) -> action + ":" + kcal;
            default -> action;
        };
        return expected.contains("/") && !(decision.action() instanceof Action.NoDecisionYet) ? base + "/" + reason : base;
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
