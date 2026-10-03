package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.decision.CallFacts;
import java.time.LocalDate;
import java.util.Arrays;
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

/**
 * The model classifies, it does not write (K-529, ADR-043 #76): a reply is used only when it is JSON of exactly
 * {@code {"topic", "rule"}} — a topic from the closed list, a rule from the call's own reasons (or none: the leading
 * one). Anything else is dropped and the coach says what the engine wrote. A topic not about the call names no rule.
 */
class TopicReplyTests {

    static final CallFacts CUT = new CallFacts(UUID.randomUUID(), LocalDate.of(2026, 10, 5), Map.of("type", "ADJUST_CALORIES", "kcalPerDay", -500),
            List.of(new CallFacts.Rule("not_toward_goal", "EXPERIENCE"), new CallFacts.Rule("stall_window", "EXPERIENCE")), "MEDIUM",
            LocalDate.of(2026, 10, 12), "decision.adjust_calories.not_toward_goal", true);

    private static final TopicReply READ = new TopicReply(400);

    @Test
    void aTopicAndOneOfTheCallsRulesAreUsed() {
        assertThat(READ.read("{\"topic\":\"HUNGER\",\"rule\":\"stall_window\"}", CUT)).contains(new TopicReply.Classified(Topic.HUNGER, "stall_window"));
    }

    @Test
    void noRuleNamedIsTheLeadingOne() {
        assertThat(READ.read("{\"topic\":\"LESS\"}", CUT)).contains(new TopicReply.Classified(Topic.LESS, "not_toward_goal"));
        assertThat(READ.read("{\"topic\":\"LESS\",\"rule\":null}", CUT)).contains(new TopicReply.Classified(Topic.LESS, "not_toward_goal"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"OFF_TOPIC", "HEALTH"})
    void aTopicNotAboutTheCallNamesNoRule(String topic) {
        assertThat(READ.read("{\"topic\":\"" + topic + "\",\"rule\":\"stall_window\"}", CUT)).contains(new TopicReply.Classified(Topic.valueOf(topic), null));
        assertThat(READ.read("{\"topic\":\"" + topic + "\"}", CUT)).contains(new TopicReply.Classified(Topic.valueOf(topic), null));
    }

    @Test
    void aCallWithoutReasonsGivesNoRule() {
        CallFacts bare = new CallFacts(CUT.id(), CUT.madeOn(), CUT.action(), List.of(), CUT.confidence(), CUT.nextReview(), CUT.copyKey(), true);
        assertThat(READ.read("{\"topic\":\"WHY\"}", bare)).contains(new TopicReply.Classified(Topic.WHY, null));
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "not json",
        "[\"HUNGER\"]",
        "\"HUNGER\"",
        "{}",
        "{\"rule\":\"stall_window\"}",
        "{\"topic\":\"STARVING\"}",
        "{\"topic\":\"hunger\"}",
        "{\"topic\":\" HUNGER\"}",
        "{\"topic\":7}",
        "{\"topic\":null}",
        "{\"topic\":\"HUNGER\",\"rule\":\"cut_step\"}",
        "{\"topic\":\"HUNGER\",\"rule\":7}",
        "{\"topic\":\"HUNGER\",\"rule\":\"\"}",
        "{\"topic\":\"WHY\",\"rule\":\"null\"}",
        "{\"topic\":\"OFF_TOPIC\",\"rule\":\"made_up\"}",
        "{\"topic\":\"LESS\",\"rule\":\"stall_window\",\"text\":\"Sure, 250 this week.\"}",
        "{\"topic\":\"LESS\",\"kcalPerDay\":-250}",
        "{\"text\":\"The call stands.\"}",
    })
    void anythingElseIsDropped(String raw) {
        assertThat(READ.read(raw, CUT)).as(raw).isEmpty();
    }

    @Test
    void theModelIsSentTheKindOfCallAndItsRulesOnly() {
        // Whatever numbers a call carries (a step, a fraction, a phase), the model gets none: it writes none (K-529).
        for (Map<String, Object> action : List.<Map<String, Object>>of(Map.of("type", "DELOAD", "setsFraction", 0.5), Map.of("type", "CHANGE_PHASE", "to", "CUT"),
                Map.of("type", "CHANGE_MOVEMENT", "stepsPerDay", 2000))) {
            CallFacts call = new CallFacts(CUT.id(), CUT.madeOn(), action, CUT.reasons(), "HIGH", CUT.nextReview(), CUT.copyKey(), true);
            String facts = Explanation.facts(call);
            assertThat(facts).contains("\"action\":\"" + action.get("type") + "\"", "not_toward_goal", "EXPERIENCE")
                    .doesNotContain("0.5", "CUT\"", "2000", "HIGH", "2026");
        }
    }

    @Test
    void aReplyLongerThanTheLimitIsNotRead() {
        String padded = "{\"topic\":\"HUNGER\"" + " ".repeat(400) + "}";
        assertThat(READ.read(padded, CUT)).isEmpty();
        assertThat(new TopicReply(padded.length()).read(padded, CUT)).isPresent();
    }

    @Property
    void whateverTheModelSaysTheRuleIsTheCallsOwnOrNone(@ForAll("topics") String topic, @ForAll("rules") String rule) {
        String raw = "{\"topic\":" + quoted(topic) + ",\"rule\":" + quoted(rule) + "}";
        READ.read(raw, CUT).ifPresent(classified -> {
            assertThat(Arrays.asList(Topic.values())).contains(classified.topic());
            assertThat(classified.rule() == null || List.of("not_toward_goal", "stall_window").contains(classified.rule())).isTrue();
        });
    }

    @Provide
    Arbitrary<String> topics() {
        return Arbitraries.oneOf(Arbitraries.of(Arrays.stream(Topic.values()).map(Enum::name).toList()), Arbitraries.strings());
    }

    @Provide
    Arbitrary<String> rules() {
        return Arbitraries.oneOf(Arbitraries.of("not_toward_goal", "stall_window", "cut_step", "bmr_floor"), Arbitraries.strings());
    }

    private static String quoted(String text) {
        return tools.jackson.databind.json.JsonMapper.builder().build().writeValueAsString(text);
    }
}
