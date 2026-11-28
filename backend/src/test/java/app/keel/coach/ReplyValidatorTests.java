package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.decision.CallFacts;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.json.JsonMapper;

/**
 * What keeps the conversational coach from deciding (ADR-092 #2, U1 U2 U6 U7 U10): a reply is shown only when it is exactly
 * {@code {reply, topic, numbersUsed}}, every number it says — digits or words — is one of the facts' and listed, and no
 * forbidden phrase, concession, change of the call, blame, naming of the coach or link is in it. Anything else is dropped: the
 * engine's own sentence is shown (Explanation).
 */
class ReplyValidatorTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    static final CallFacts CUT = new CallFacts(UUID.randomUUID(), LocalDate.of(2026, 10, 5), Map.of("type", "ADJUST_CALORIES", "kcalPerDay", -500),
            List.of(new CallFacts.Rule("not_toward_goal", "EXPERIENCE", Map.of("kgPerWeek", 0.1, "weeks", 3)),
                    new CallFacts.Rule("stall_window", "EXPERIENCE")), "MEDIUM", LocalDate.of(2026, 10, 12), LocalDate.of(2026, 10, 19),
            "decision.adjust_calories.not_toward_goal", true,
            Map.of("week", Map.of("training", Map.of("planned", 4, "done", 3, "left", 1)), "profile", Map.of("goal", "LOSE_FAT", "trainingDaysPerWeek", 4)));

    private static final CoachFacts FACTS = CoachFacts.of(CUT);
    private static final ReplyValidator CHECK = new ReplyValidator(400, ForbiddenWords.fromClasspath(), ReplyRules.fromClasspath());

    private static String reply(String text, String topic, Object... numbers) {
        return JSON.writeValueAsString(Map.of("reply", text, "topic", topic, "numbersUsed", List.of(numbers)));
    }

    private static List<String> problems(String raw) {
        return CHECK.problems(raw, CUT, FACTS);
    }

    @Test
    void aReplyThatTellsTheCallFromTheFactsIsShown() {
        String raw = reply("The call stands: the cut is 500 kcal a day because about 0.1 kg a week over 3 weeks is not toward your goal.", "WHY", 500, 0.1, 3);

        assertThat(problems(raw)).isEmpty();
        assertThat(CHECK.read(raw, CUT, FACTS)).contains(new ReplyValidator.Valid(
                "The call stands: the cut is 500 kcal a day because about 0.1 kg a week over 3 weeks is not toward your goal.", Topic.WHY, "not_toward_goal"));
    }

    @Test
    void theReplyTheApiTestsTellTheCallWithPasses() {
        // CoachMessagesApiTests' told(): the call's one number, no concession.
        assertThat(problems(reply("The call stands this week, and the cut is 500 kcal a day.", "WHY", 500))).isEmpty();
    }

    @Test
    void aCauseTheEngineDoesNotReadIsNotShown() {
        // K-1265 (ADR-096 #4, U1 U3): the engine reads the sets, not sleep, food or stress; a reply that gives one as the cause of a
        // heavy session is not shown, the engine's sentence is. Saying the log does not hold them is fine.
        assertThat(problems(reply("It felt heavy because you slept badly this week.", "WHY"))).contains("rule:unread-cause");
        assertThat(problems(reply("Probably the stress at work, so take it easy.", "WHY"))).contains("rule:unread-cause");
        assertThat(problems(reply("Az uyuduğun için ağır gelmiş olabilir.", "WHY"))).contains("rule:unread-cause");
        assertThat(problems(reply("Sleep and food are not in your log, so the call reads your sets only.", "WHY"))).isEmpty();
    }

    @Test
    void aReplyWithNoNumberNeedsNone() {
        assertThat(CHECK.read(reply("The call stays as it is, and the reason is that the trend is flat.", "LESS"), CUT, FACTS)).isPresent();
    }

    @Test
    void numbersRoundedOrWrittenAnotherWayAreTheSameFacts() {
        assertThat(problems(reply("Three of 4 sessions are done and 1 is left.", "WHY", 3, 4, 1))).isEmpty();
        assertThat(problems(reply("About 0.1 kg a week.", "WHY", 0.1))).isEmpty();
        assertThat(problems(reply("Around 500 kcal, 1 session left.", "WHY", 500, 1))).isEmpty();
        // "0,1" with a decimal comma (Turkish), a thousands comma written for a number that is a fact.
        assertThat(problems(reply("Haftada yaklaşık 0,1 kg.", "WHY", 0.1))).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "Eat 1,900 kcal a day.",
        "Let the cut be 250 kcal.",
        "That is 0.35 kg a week.",
        "A deficit of 500.5 kcal.",
        "Your 4 sessions and 7 days.",
        "Two hundred and fifty is too little.",
        "Twice a day is fine.",
        "Bu hafta yedi öğün.",
        "Fifty percent of it.",
        "You lost 82.4 kg.",
        "In 12 weeks.",
    })
    void aNumberThatIsNotAFactDropsTheReplyEvenWhenListed(String text) {
        List<Object> listed = ReplyNumbers.in(text).stream().map(said -> (Object) said.value().doubleValue()).toList();
        String raw = JSON.writeValueAsString(Map.of("reply", text, "topic", "WHY", "numbersUsed", listed));

        assertThat(problems(raw)).as(text).isNotEmpty();
        assertThat(CHECK.read(raw, CUT, FACTS)).as(text).isEmpty();
    }

    @Test
    void aNumberTheModelDoesNotListDropsTheReply() {
        assertThat(problems(reply("The cut is 500 kcal a day.", "WHY"))).contains("number-not-listed:500");
        assertThat(problems(reply("The cut is 500 kcal a day.", "WHY", 3))).contains("number-not-listed:500");
    }

    @Test
    void aNumberListedThatIsNotAFactDropsTheReplyEvenIfTheTextSaysNone() {
        assertThat(problems(reply("The call stands.", "WHY", 250))).contains("listed-not-a-fact:250");
    }

    @Test
    void aPercentIsTheFactAsAFractionOrTheFactItself() {
        CallFacts deload = new CallFacts(CUT.id(), CUT.madeOn(), Map.of("type", "DELOAD", "setsFraction", 0.5), CUT.reasons(), "HIGH", CUT.nextReview(),
                CUT.nextCallOn(), CUT.copyKey(), true);
        CoachFacts facts = CoachFacts.of(deload);

        assertThat(CHECK.problems(reply("Half the sets, 50% of the usual.", "WHY", 0.5, 50), deload, facts)).isEmpty();
        assertThat(CHECK.problems(reply("Only 30% of the sets.", "WHY", 30), deload, facts)).isNotEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "You're right, I'll lower the cut this week.",
        "Let's make it smaller for now.",
        "We can postpone the step until after the trip.",
        "Try to cut your calories a little more.",
        "You could eat more on training days.",
        "That is a good point, so here is the new call.",
        "Take maintenance this week.",
        "Haklısın, bu hafta kaloriyi düşürelim.",
        "Adımı değiştirebiliriz.",
    })
    void aConcessionOrAChangeOfTheCallDropsTheReply(String text) {
        assertThat(problems(reply(text, "LESS"))).as(text).anyMatch(problem -> problem.startsWith("rule:changes-the-call"));
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "Your body fat is about 18% body fat.",
        "This sounds like insulin resistance.",
        "That may be a sign of a thyroid problem.",
        "Bu bir belirti olabilir, ilaç kullanıyor musun?",
        "You failed to follow the plan.",
        "Make up for it with an extra session.",
        "Keep the streak going.",
        "As an AI I cannot say.",
        "See https://example.com/plan for more.",
    })
    void forbiddenPhrasesBlameAndNamingTheCoachDropTheReply(String text) {
        assertThat(problems(reply(text, "WHY"))).as(text).isNotEmpty();
    }

    @Test
    void aTopicNotAboutTheCallIsReadButItsWordsAreNotShown() {
        // U6: a doctor comes first — and the coach talks about nothing else than the plan: the app says its own sentence.
        for (String topic : List.of("HEALTH", "OFF_TOPIC")) {
            assertThat(CHECK.read(reply("Please talk to your doctor about that.", topic), CUT, FACTS)).as(topic)
                    .contains(new ReplyValidator.Valid(null, Topic.valueOf(topic), null));
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "not json",
        "[]",
        "{}",
        "{\"reply\":\"The call stands.\",\"topic\":\"WHY\"}",
        "{\"reply\":\"The call stands.\",\"numbersUsed\":[]}",
        "{\"topic\":\"WHY\",\"numbersUsed\":[]}",
        "{\"reply\":\"The call stands.\",\"topic\":\"WHY\",\"numbersUsed\":[],\"call\":{\"type\":\"CONTINUE\"}}",
        "{\"reply\":\"The call stands.\",\"topic\":\"WHY\",\"numbersUsed\":[],\"text\":\"Sure.\"}",
        "{\"reply\":7,\"topic\":\"WHY\",\"numbersUsed\":[]}",
        "{\"reply\":\"The call stands.\",\"topic\":\"why\",\"numbersUsed\":[]}",
        "{\"reply\":\"The call stands.\",\"topic\":\"STARVING\",\"numbersUsed\":[]}",
        "{\"reply\":\"The call stands.\",\"topic\":\"WHY\",\"numbersUsed\":\"500\"}",
        "{\"reply\":\"The call stands.\",\"topic\":\"WHY\",\"numbersUsed\":[\"500\"]}",
        "{\"reply\":\"The call stands.\",\"topic\":null,\"numbersUsed\":[]}",
        "{\"reply\":\" \",\"topic\":\"WHY\",\"numbersUsed\":[]}",
    })
    void anythingOffTheSchemaIsDropped(String raw) {
        assertThat(CHECK.read(raw, CUT, FACTS)).as(raw).isEmpty();
    }

    @Test
    void aReplyLongerThanTheLimitIsDropped() {
        assertThat(problems(reply("The call stands. ".repeat(30), "WHY"))).isNotEmpty();
        assertThat(problems(reply("a".repeat(401), "WHY"))).contains("length-or-characters");
        assertThat(problems(reply("a".repeat(400), "WHY"))).isEmpty();
    }

    @Test
    void aCallWithoutReasonsHasNoRule() {
        CallFacts bare = new CallFacts(CUT.id(), CUT.madeOn(), CUT.action(), List.of(), CUT.confidence(), CUT.nextReview(), CUT.nextCallOn(), CUT.copyKey(),
                true);
        assertThat(CHECK.read(reply("The call stands.", "WHY"), bare, CoachFacts.of(bare))).contains(new ReplyValidator.Valid("The call stands.", Topic.WHY, null));
    }

    @Property
    void noNumberOutsideTheFactsIsEverShown(@ForAll("outsiders") int number) {
        String raw = reply("The step is " + number + " kcal.", "WHY", number);
        assertThat(CHECK.read(raw, CUT, FACTS)).isEmpty();
    }

    @Provide
    Arbitrary<Integer> outsiders() {
        // Not one of the facts (500, 4, 3, 1, 0 and the rounded 0.1 → 0).
        return Arbitraries.integers().between(5, 100_000).filter(number -> number != 500);
    }
}
