package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.Action;
import app.keel.engine.CheckIn;
import app.keel.engine.Confidence;
import app.keel.engine.CopyKey;
import app.keel.engine.Decision;
import app.keel.engine.Phase;
import app.keel.engine.Reason;
import app.keel.engine.RuleId;
import app.keel.engine.Source;
import app.keel.engine.SourceTag;
import app.keel.engine.DecisionPipeline;
import app.keel.engine.EnergyAvailability;
import app.keel.engine.ParameterDomain;
import app.keel.engine.ParameterSet;
import app.keel.engine.Parameters;
import app.keel.engine.Profile;
import app.keel.engine.Sex;
import app.keel.engine.Snapshot;
import app.keel.engine.WeighIn;
import app.keel.engine.WeightSeries;
import app.keel.engine.WeeklySpine;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.yaml.snakeyaml.Yaml;

/**
 * Which questions a check-in asks (K-213, U9, 04 §8.5 CAT): only what the engine would wait for, found by running it on
 * what the data already says and on each possible answer; no more than the week's budget — larger when the data
 * disagrees with itself.
 */
class QuestionBudgetTests {

    // The spine's order (03 §2.4): training first; if training is not declining, recovery.
    private static final Function<CheckIn, Decision> SPINE = checkIn -> {
        if (checkIn.training() == CheckIn.Training.UNKNOWN) {
            return waiting("check_in_needed_training");
        }
        if (checkIn.training() != CheckIn.Training.DECLINING && checkIn.recovery() == CheckIn.Recovery.UNKNOWN) {
            return waiting("check_in_needed_recovery");
        }
        return decided();
    };

    @Test
    void theQuestionsAreWhatTheEngineWouldWaitForInItsOrder() {
        assertThat(CheckInQuestions.needed(SPINE, CheckIn.NONE, 2)).containsExactly(Answers.Kind.TRAINING, Answers.Kind.RECOVERY);
    }

    @Test
    void theBudgetStopsTheList() {
        assertThat(CheckInQuestions.needed(SPINE, CheckIn.NONE, 1)).containsExactly(Answers.Kind.TRAINING);
    }

    @Test
    void whatTheDataAlreadySaysIsNotAsked() {
        CheckIn trainingKnown = new CheckIn(CheckIn.Look.UNKNOWN, CheckIn.Training.STABLE, CheckIn.Recovery.UNKNOWN, CheckIn.Waist.UNKNOWN,
                java.util.Optional.empty(), CheckIn.Appetite.UNKNOWN);

        assertThat(CheckInQuestions.needed(SPINE, trainingKnown, 2)).containsExactly(Answers.Kind.RECOVERY);
        assertThat(CheckInQuestions.needed(checkIn -> decided(), CheckIn.NONE, 2)).as("a call without questions").isEmpty();
    }

    @Test
    void theDataDisagreeingWithItselfOpensTheLargerBudget() {
        assertThat(CheckInQuestions.anomaly(with(CheckIn.Look.WORSE, CheckIn.Waist.UNKNOWN), Phase.CUT)).isTrue();
        assertThat(CheckInQuestions.anomaly(with(CheckIn.Look.UNKNOWN, CheckIn.Waist.UP), Phase.CUT)).isTrue();
        assertThat(CheckInQuestions.anomaly(with(CheckIn.Look.UNKNOWN, CheckIn.Waist.DOWN), Phase.BULK)).isTrue();
        assertThat(CheckInQuestions.anomaly(with(CheckIn.Look.BETTER, CheckIn.Waist.DOWN), Phase.CUT)).isFalse();
        assertThat(CheckInQuestions.anomaly(with(CheckIn.Look.SAME, CheckIn.Waist.FLAT), Phase.BULK)).isFalse();
    }

    @Test
    void theFirstWeeksRiskOpensTheLargerBudgetToo() {
        // K-513, ADR-040 #4: a risky week of the first eight is an anomaly's budget (U9: at most 5) — a cap, not a reason to ask.
        assertThat(CheckInQuestions.largerBudget(CheckIn.NONE, Phase.CUT, true)).isTrue();
        assertThat(CheckInQuestions.largerBudget(CheckIn.NONE, Phase.CUT, false)).isFalse();
        assertThat(CheckInQuestions.largerBudget(with(CheckIn.Look.WORSE, CheckIn.Waist.UNKNOWN), Phase.CUT, false)).isTrue();
    }

    @Test
    void aQuestionSaysWhyItIsAsked() {
        // U9: every question comes with the reason it is asked.
        assertThat(CheckInQuestions.describe(Answers.Kind.TRAINING)).isEqualTo(new CheckInQuestions.Question(Answers.Kind.TRAINING, "CHOICE",
                List.of("IMPROVING", "STABLE", "DECLINING"), "checkIn.question.training", "checkIn.reason.training"));
        assertThat(CheckInQuestions.describe(Answers.Kind.RECOVERY).choices()).containsExactly("GOOD", "POOR");
    }

    @Test
    void anEngineThatKeepsWaitingForAnAnsweredQuestionDoesNotHangTheCheckIn() {
        // The spine never does this; if it ever did, the search must still end (K-213 review), not grow until memory runs out.
        AtomicInteger runs = new AtomicInteger();
        Function<CheckIn, Decision> stuck = checkIn -> {
            if (runs.incrementAndGet() > 100) {
                throw new AssertionError("the engine ran " + runs.get() + " times");
            }
            return waiting("check_in_needed_training");
        };

        assertThat(CheckInQuestions.needed(stuck, CheckIn.NONE, 2)).containsExactly(Answers.Kind.TRAINING);
    }

    @Test
    void theRealEngineAsksTrainingThenRecoveryOnACutThatLooksWorse() {
        // Against DecisionPipeline itself, not a copy of the spine: a reason put before the check-in rule would show here.
        Parameters p = engineParameters().forSex(Sex.MALE);
        LocalDate today = LocalDate.of(2026, 9, 30);
        List<WeighIn> weights = new ArrayList<>();
        for (int day = 27; day >= 0; day--) {
            weights.add(new WeighIn(today.minusDays(day), new BigDecimal("86.0").subtract(new BigDecimal("0.1").multiply(BigDecimal.valueOf(27 - day)))));
        }
        Function<CheckIn, Decision> engine = checkIn -> DecisionPipeline.decide(new Snapshot(today, Sex.MALE, Phase.CUT, today.minusDays(42),
                new WeightSeries(weights), Optional.empty(), Optional.empty(), false, checkIn, Optional.of(new Profile(30, 180)), false,
                today.minusDays(42), Optional.empty()), p);

        assertThat(CheckInQuestions.needed(engine, with(CheckIn.Look.WORSE, CheckIn.Waist.UNKNOWN), 5))
                .containsExactly(Answers.Kind.TRAINING, Answers.Kind.RECOVERY);
        assertThat(CheckInQuestions.needed(engine, with(CheckIn.Look.SAME, CheckIn.Waist.UNKNOWN), 5)).as("toward the goal, looking the same").isEmpty();
    }

    @Test
    void everyAnswerTheEngineCanWaitForIsAQuestionWithItsWords() {
        Map<String, Object> copy = copy();
        for (WeeklySpine.Missing missing : WeeklySpine.Missing.values()) {
            CheckInQuestions.Question question = CheckInQuestions.describe(Answers.Kind.valueOf(missing.name()));
            assertThat(lookUp(copy, question.copyKey())).as(question.copyKey()).isInstanceOf(String.class);
            assertThat(lookUp(copy, question.reasonCopyKey())).as(question.reasonCopyKey()).isInstanceOf(String.class);
            question.choices().forEach(choice -> {
                String key = "checkIn.choice." + missing.name().toLowerCase(java.util.Locale.ROOT) + "." + choice.toLowerCase(java.util.Locale.ROOT);
                assertThat(lookUp(copy, key)).as(key).isInstanceOf(String.class);
            });
        }
    }

    @Test
    void theCycleIsAskedOnlyOfAWomanInTheLowEnergyBand() {
        // V4, ADR-020 L-1: one tap when energy availability is low; the band needs the fat estimate (K-224).
        assertThat(CheckInQuestions.asksAboutTheCycle(Sex.FEMALE, Optional.of(EnergyAvailability.LOW))).isTrue();
        for (EnergyAvailability band : List.of(EnergyAvailability.WARNING, EnergyAvailability.REDUCED, EnergyAvailability.ADEQUATE)) {
            assertThat(CheckInQuestions.asksAboutTheCycle(Sex.FEMALE, Optional.of(band))).as(band.name()).isFalse();
        }
        assertThat(CheckInQuestions.asksAboutTheCycle(Sex.FEMALE, Optional.empty())).as("band not known").isFalse();
        assertThat(CheckInQuestions.asksAboutTheCycle(Sex.MALE, Optional.of(EnergyAvailability.LOW))).isFalse();
    }

    @Test
    void theCycleIsAskedWhenAnAnswerTheWeekCanGiveWouldLeaveTheCallWaitingForIt() {
        // K-229 review: held after a hard stop, the spine first waits for training; a declining answer would cut — and
        // then wait for the cycle. Looking only at the unanswered call, the cycle question was never asked and every
        // such week would end without a call.
        Function<CheckIn, Decision> held = checkIn -> switch (checkIn.training()) {
            case UNKNOWN -> waiting("check_in_needed_training");
            case DECLINING -> waiting("cycle_check_needed");
            default -> decided();
        };

        assertThat(CheckInQuestions.cycleAwaited(held, CheckIn.NONE, List.of(Answers.Kind.TRAINING))).isTrue();
        assertThat(CheckInQuestions.cycleAwaited(held, CheckIn.NONE, List.of())).as("training not asked: it cannot be answered").isFalse();
        assertThat(CheckInQuestions.cycleAwaited(SPINE, CheckIn.NONE, List.of(Answers.Kind.TRAINING, Answers.Kind.RECOVERY))).isFalse();
        assertThat(CheckInQuestions.cycleAwaited(checkIn -> waiting("cycle_check_needed"), CheckIn.NONE, List.of()))
                .as("the data alone").isTrue();
    }

    @Test
    void theCycleIsAwaitedAfterTwoAnswersOrWithTheSecondLeftOpen() {
        Function<CheckIn, Decision> late = checkIn -> checkIn.training() == CheckIn.Training.STABLE && checkIn.recovery() == CheckIn.Recovery.GOOD
                ? waiting("cycle_check_needed") : decided();
        Function<CheckIn, Decision> skipped = checkIn -> checkIn.training() == CheckIn.Training.STABLE && checkIn.recovery() == CheckIn.Recovery.UNKNOWN
                ? waiting("cycle_check_needed") : decided();
        List<Answers.Kind> both = List.of(Answers.Kind.TRAINING, Answers.Kind.RECOVERY);

        assertThat(CheckInQuestions.cycleAwaited(late, CheckIn.NONE, both)).isTrue();
        assertThat(CheckInQuestions.cycleAwaited(skipped, CheckIn.NONE, both)).as("a question may be left unanswered").isTrue();
        assertThat(CheckInQuestions.cycleAwaited(late, CheckIn.NONE, List.of(Answers.Kind.TRAINING))).isFalse();
    }

    @Test
    void appetiteIsAskedWhenItsAnswerWouldChangeTheCallAndTheBudgetHasRoom() {
        // K-227, G7 K-102: a long bulk whose appetite has gone gets a mini cut — only the user can say so. Asked after the
        // engine's own questions, inside the budget (U9: few questions).
        Function<CheckIn, Decision> longBulk = checkIn -> checkIn.appetite() == CheckIn.Appetite.GONE ? miniCut() : SPINE.apply(checkIn);
        CheckIn trainingAndRecoveryKnown = CheckIn.NONE.withTraining(CheckIn.Training.STABLE).withRecovery(CheckIn.Recovery.GOOD);

        assertThat(CheckInQuestions.needed(longBulk, trainingAndRecoveryKnown, 2)).containsExactly(Answers.Kind.APPETITE);
        assertThat(CheckInQuestions.needed(longBulk, CheckIn.NONE, 3))
                .containsExactly(Answers.Kind.TRAINING, Answers.Kind.RECOVERY, Answers.Kind.APPETITE);
        assertThat(CheckInQuestions.needed(longBulk, CheckIn.NONE, 2)).as("the budget is full").containsExactly(Answers.Kind.TRAINING, Answers.Kind.RECOVERY);
        assertThat(CheckInQuestions.needed(SPINE, trainingAndRecoveryKnown, 2)).as("an answer that changes nothing").isEmpty();
    }

    @Test
    void afterAHardStopAGoneAppetiteAlsoAsksTheCycle() {
        // K-227 review: held after a hard stop (K-229), a gone appetite would make a mini cut — a deficit — so the call
        // would wait for the cycle question: it is asked in the same check-in.
        Function<CheckIn, Decision> held = checkIn -> checkIn.appetite() == CheckIn.Appetite.GONE ? waiting("cycle_check_needed") : SPINE.apply(checkIn);
        CheckIn known = CheckIn.NONE.withTraining(CheckIn.Training.STABLE).withRecovery(CheckIn.Recovery.GOOD);

        List<Answers.Kind> asked = CheckInQuestions.needed(held, known, 2);

        assertThat(asked).containsExactly(Answers.Kind.APPETITE);
        assertThat(CheckInQuestions.cycleAwaited(held, known, asked)).isTrue();
        assertThat(CheckInQuestions.cycleAwaited(SPINE, known, CheckInQuestions.needed(SPINE, known, 2))).isFalse();
    }

    @Test
    void appetiteIsAChoiceOfNormalOrGoneWithItsWordsAndIsTaken() {
        Map<String, Object> copy = copy();
        CheckInQuestions.Question question = CheckInQuestions.describe(Answers.Kind.APPETITE);

        assertThat(question).isEqualTo(new CheckInQuestions.Question(Answers.Kind.APPETITE, "CHOICE", List.of("NORMAL", "GONE"),
                "checkIn.question.appetite", "checkIn.reason.appetite"));
        for (String key : List.of(question.copyKey(), question.reasonCopyKey(), "checkIn.choice.appetite.normal", "checkIn.choice.appetite.gone")) {
            assertThat(lookUp(copy, key)).as(key).isInstanceOf(String.class);
        }
        assertThat(CheckInQuestions.answerable(Answers.Kind.APPETITE)).isTrue();
    }

    @Test
    void theCycleQuestionIsAYesOrNoWithItsWords() {
        Map<String, Object> copy = copy();
        CheckInQuestions.Question question = CheckInQuestions.describe(Answers.Kind.CYCLE_STOPPED);

        assertThat(question).isEqualTo(new CheckInQuestions.Question(Answers.Kind.CYCLE_STOPPED, "CHOICE", List.of("YES", "NO"),
                "checkIn.question.cycle_stopped", "checkIn.reason.cycle_stopped"));
        for (String key : List.of(question.copyKey(), question.reasonCopyKey(), "checkIn.choice.cycle_stopped.yes", "checkIn.choice.cycle_stopped.no")) {
            assertThat(lookUp(copy, key)).as(key).isInstanceOf(String.class);
        }
    }

    @Test
    void theBudgetIsReadFromTheQuotaFile() throws IOException {
        Map<String, Object> quota = yaml("data/parameters/quota.yaml");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> parameters = (List<Map<String, Object>>) quota.get("parameters");
        Function<String, Object> value = key -> parameters.stream().filter(parameter -> key.equals(parameter.get("key"))).findFirst().orElseThrow()
                .get("value");
        QuestionBudget budget = new QuestionBudget();

        assertThat(budget.forWeek(false)).isEqualTo(value.apply("question_budget_per_week"));
        assertThat(budget.forWeek(true)).isEqualTo(value.apply("question_budget_per_week_anomaly"));
    }

    private static ParameterSet engineParameters() {
        Map<String, Object> documents = new HashMap<>();
        for (ParameterDomain domain : ParameterDomain.values()) {
            documents.put(domain.fileName(), yaml("data/parameters/" + domain.fileName()));
        }
        return ParameterSet.fromDocuments(documents);
    }

    /** The whole of data/copy/en.json (JSON is valid YAML); it is not on the classpath. */
    private static Map<String, Object> copy() {
        try (java.io.Reader reader = java.nio.file.Files.newBufferedReader(java.nio.file.Path.of("../data/copy/en.json"))) {
            return new Yaml().load(reader);
        } catch (IOException e) {
            throw new IllegalStateException("data/copy/en.json", e);
        }
    }

    private static Object lookUp(Map<String, Object> tree, String dotted) {
        Object node = tree;
        for (String part : dotted.split("\\.")) {
            node = node instanceof Map<?, ?> map ? map.get(part) : null;
        }
        return node;
    }

    private static Map<String, Object> yaml(String classpath) {
        try (InputStream in = new ClassPathResource(classpath).getInputStream()) {
            return new Yaml().load(in);
        } catch (IOException e) {
            throw new IllegalStateException(classpath, e);
        }
    }

    private static CheckIn with(CheckIn.Look look, CheckIn.Waist waist) {
        return new CheckIn(look, CheckIn.Training.UNKNOWN, CheckIn.Recovery.UNKNOWN, waist, java.util.Optional.empty(), CheckIn.Appetite.UNKNOWN);
    }

    private static Decision waiting(String rule) {
        return new Decision(new Action.NoDecisionYet(), List.of(new Reason(new RuleId(rule),
                new Source("arastirma/03-guray-karar-omurgasi.md#2.4", SourceTag.EXPERIENCE))), Confidence.MEDIUM, LocalDate.of(2026, 10, 5),
                new CopyKey("decision.no_decision_yet.x"));
    }

    private static Decision miniCut() {
        return new Decision(new Action.MiniCut(4, 6), List.of(new Reason(new RuleId("appetite_gone"),
                new Source("arastirma/ham/guray/G7-whisper-arsiv.md#K-102", SourceTag.EXPERIENCE))), Confidence.MEDIUM, LocalDate.of(2026, 10, 5),
                new CopyKey("decision.mini_cut.appetite_gone"));
    }

    private static Decision decided() {
        return new Decision(new Action.Continue(), List.of(new Reason(new RuleId("toward_goal"),
                new Source("arastirma/03-guray-karar-omurgasi.md#2.4", SourceTag.EXPERIENCE))), Confidence.MEDIUM, LocalDate.of(2026, 10, 5),
                new CopyKey("decision.continue"));
    }
}
