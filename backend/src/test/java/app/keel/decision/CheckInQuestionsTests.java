package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import app.keel.engine.Action;
import app.keel.engine.CheckIn;
import app.keel.engine.Confidence;
import app.keel.engine.CopyKey;
import app.keel.engine.Decision;
import app.keel.engine.DecisionPipeline;
import app.keel.engine.Experience;
import app.keel.engine.FirstWeekAdjustment;
import app.keel.engine.ParameterDomain;
import app.keel.engine.ParameterSet;
import app.keel.engine.Parameters;
import app.keel.engine.Phase;
import app.keel.engine.Reason;
import app.keel.engine.RuleId;
import app.keel.engine.Sex;
import app.keel.engine.Snapshot;
import app.keel.engine.Source;
import app.keel.engine.SourceTag;
import app.keel.engine.WeighIn;
import app.keel.engine.WeightSeries;
import java.io.IOException;
import java.io.InputStream;
import java.io.Reader;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.yaml.snakeyaml.Yaml;

/**
 * "How did week 1 feel?" (K-962, ADR-077 #2 and #4; U9): asked at the check-in that closes the first week, and only when
 * its answer could change the call — every planned session done, someone not starting out, fewer days than the ideal. It
 * counts against the week's budget like any other question.
 */
class CheckInQuestionsTests {

    private static final LocalDate MONDAY = LocalDate.of(2026, 10, 12);
    private static final Source DAYS = new Source("arastirma/ham/guray/G6-eski-arsiv.md#K-36", SourceTag.EXPERIENCE);

    // "I could do more" adds the day whatever else is answered; otherwise training, then recovery, as the spine asks them.
    private static final Function<CheckIn, Decision> SPINE_AND_FEEL = checkIn -> {
        if (checkIn.week1Feel() == CheckIn.Week1Feel.COULD_DO_MORE) {
            return call(new Action.AddTrainingDay(4, 4), "first_week_add_day");
        }
        if (checkIn.training() == CheckIn.Training.UNKNOWN) {
            return call(new Action.NoDecisionYet(), "check_in_needed_training");
        }
        if (checkIn.recovery() == CheckIn.Recovery.UNKNOWN) {
            return call(new Action.NoDecisionYet(), "check_in_needed_recovery");
        }
        return call(new Action.Continue(), "first_week_on_track");
    };

    @Test
    void theFeelIsAskedWhenAnAnswerWouldChangeTheCall() {
        Function<CheckIn, Decision> firstWeek = checkIn -> checkIn.week1Feel() == CheckIn.Week1Feel.COULD_DO_MORE
                ? call(new Action.AddTrainingDay(4, 4), "first_week_add_day") : call(new Action.Continue(), "first_week_on_track");

        assertThat(CheckInQuestions.needed(firstWeek, CheckIn.NONE, 2)).containsExactly(Answers.Kind.WEEK1_FEEL);
        assertThat(CheckInQuestions.needed(checkIn -> call(new Action.Continue(), "first_week_on_track"), CheckIn.NONE, 2))
                .as("an answer that changes nothing").isEmpty();
    }

    @Test
    void theFeelCountsAgainstTheBudget() {
        CheckIn trained = CheckIn.NONE.withTraining(CheckIn.Training.STABLE).withRecovery(CheckIn.Recovery.GOOD);

        assertThat(CheckInQuestions.needed(SPINE_AND_FEEL, CheckIn.NONE, 2)).as("the budget is full")
                .containsExactly(Answers.Kind.TRAINING, Answers.Kind.RECOVERY);
        assertThat(CheckInQuestions.needed(SPINE_AND_FEEL, CheckIn.NONE, 3))
                .containsExactly(Answers.Kind.TRAINING, Answers.Kind.RECOVERY, Answers.Kind.WEEK1_FEEL);
        assertThat(CheckInQuestions.needed(SPINE_AND_FEEL, trained, 2)).containsExactly(Answers.Kind.WEEK1_FEEL);
    }

    @Test
    void theRealEngineAsksItOnlyWhereItCouldAddADay() {
        Parameters p = parameters();

        assertThat(asked(new FirstWeekAdjustment.Week(3, 3, 3, List.of(), Optional.of(Experience.UNDER_1Y)), p))
                .containsExactly(Answers.Kind.WEEK1_FEEL);
        assertThat(asked(new FirstWeekAdjustment.Week(3, 3, 3, List.of(), Optional.of(Experience.NEW)), p)).as("starting out").isEmpty();
        assertThat(asked(new FirstWeekAdjustment.Week(3, 3, 3, List.of(), Optional.empty()), p)).as("experience not asked").isEmpty();
        assertThat(asked(new FirstWeekAdjustment.Week(3, 2, 3, List.of(DayOfWeek.FRIDAY), Optional.of(Experience.Y3_PLUS)), p))
                .as("a session missed").isEmpty();
        assertThat(asked(new FirstWeekAdjustment.Week(4, 4, 4, List.of(), Optional.of(Experience.Y3_PLUS)), p)).as("at the ideal").isEmpty();
    }

    @Test
    void anyOtherWeekNeverAsksIt() {
        assertThat(asked(null, parameters())).doesNotContain(Answers.Kind.WEEK1_FEEL);
    }

    @Test
    void theFeelIsAChoiceOfThreeWithItsWordsAndIsTaken() throws IOException {
        Map<String, Object> copy = copy();
        CheckInQuestions.Question question = CheckInQuestions.describe(Answers.Kind.WEEK1_FEEL);

        assertThat(question).isEqualTo(new CheckInQuestions.Question(Answers.Kind.WEEK1_FEEL, "CHOICE", List.of("TOO_MUCH", "ABOUT_RIGHT", "COULD_DO_MORE"),
                "checkIn.question.week1_feel", "checkIn.reason.week1_feel"));
        for (String key : List.of(question.copyKey(), question.reasonCopyKey(), "checkIn.choice.week1_feel.too_much",
                "checkIn.choice.week1_feel.about_right", "checkIn.choice.week1_feel.could_do_more")) {
            assertThat(lookUp(copy, key)).as(key).isInstanceOf(String.class);
        }
        assertThat(lookUp(copy, "checkIn.question.week1_feel")).isEqualTo("How did week 1 feel?");
        assertThat(CheckInQuestions.answerable(Answers.Kind.WEEK1_FEEL)).isTrue();
    }

    @Test
    void theAnswerIsReadIntoTheCheckIn() {
        Answers.Read read = Answers.read(List.of(new Answers.Answer(Answers.Kind.WEEK1_FEEL, null, "COULD_DO_MORE", null)), Sex.MALE);

        assertThat(read.checkIn().week1Feel()).isEqualTo(CheckIn.Week1Feel.COULD_DO_MORE);
        assertThat(Answers.read(List.of(), Sex.MALE).checkIn().week1Feel()).isEqualTo(CheckIn.Week1Feel.UNKNOWN);
        assertThatIllegalArgumentException().isThrownBy(() -> Answers.read(List.of(new Answers.Answer(Answers.Kind.WEEK1_FEEL, null, "UNKNOWN", null)),
                Sex.MALE));
        assertThatIllegalArgumentException().isThrownBy(() -> Answers.read(List.of(new Answers.Answer(Answers.Kind.WEEK1_FEEL, null, "EASY", null)),
                Sex.MALE));
    }

    @Test
    void anAnswerInAnotherWeekIsNotReadNorKept() throws Exception {
        // Taken (a question shown is never refused), but only the check-in that closes the first week reads it.
        assertThat(DecisionService.week1Feel(CheckIn.Week1Feel.COULD_DO_MORE, false)).isEqualTo(CheckIn.Week1Feel.UNKNOWN);
        assertThat(DecisionService.week1Feel(CheckIn.Week1Feel.COULD_DO_MORE, true)).isEqualTo(CheckIn.Week1Feel.COULD_DO_MORE);
        Snapshot later = new Snapshot(MONDAY, Sex.MALE, Phase.CUT, MONDAY.minusDays(20), new WeightSeries(List.of()))
                .withCheckIn(CheckIn.NONE.withWeek1Feel(DecisionService.week1Feel(CheckIn.Week1Feel.TOO_MUCH, false)));

        assertThat(tools.jackson.databind.json.JsonMapper.builder().build().writeValueAsString(StoredSnapshot.of(later))).doesNotContain("week1Feel");
    }

    /** The questions DecisionPipeline asks on day seven of a new account, closing this first week (none: another week). */
    private static List<Answers.Kind> asked(FirstWeekAdjustment.Week week, Parameters p) {
        List<WeighIn> weights = new ArrayList<>();
        for (int day = 6; day >= 0; day--) {
            weights.add(new WeighIn(MONDAY.minusDays(day), new BigDecimal("80.0")));
        }
        Snapshot base = new Snapshot(MONDAY, Sex.MALE, Phase.CUT, MONDAY.minusDays(6), new WeightSeries(weights));
        Snapshot snapshot = week == null ? base : base.withFirstWeek(week);
        return CheckInQuestions.needed(checkIn -> DecisionPipeline.decide(snapshot.withCheckIn(checkIn), p), CheckIn.NONE, 2);
    }

    private static Decision call(Action action, String rule) {
        return new Decision(action, List.of(new Reason(new RuleId(rule), DAYS)), Confidence.MEDIUM, MONDAY.plusDays(7),
                new CopyKey("decision." + action.type().name().toLowerCase(java.util.Locale.ROOT) + "." + rule));
    }

    private static Parameters parameters() {
        Map<String, Object> documents = new HashMap<>();
        for (ParameterDomain domain : ParameterDomain.values()) {
            try (InputStream in = new ClassPathResource("data/parameters/" + domain.fileName()).getInputStream()) {
                documents.put(domain.fileName(), new Yaml().load(in));
            } catch (IOException e) {
                throw new IllegalStateException(domain.fileName(), e);
            }
        }
        return ParameterSet.fromDocuments(documents).forSex(Sex.MALE);
    }

    private static Map<String, Object> copy() throws IOException {
        try (Reader reader = Files.newBufferedReader(Path.of("../data/copy/en.json"))) {
            return new Yaml().load(reader);
        }
    }

    private static Object lookUp(Map<String, Object> tree, String dotted) {
        Object node = tree;
        for (String part : dotted.split("\\.")) {
            node = node instanceof Map<?, ?> map ? map.get(part) : null;
        }
        return node;
    }
}
