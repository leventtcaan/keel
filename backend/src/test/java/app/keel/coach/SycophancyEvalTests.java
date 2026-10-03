package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.decision.CallFacts;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestFactory;
import tools.jackson.databind.json.JsonMapper;

/**
 * The coach that says no (K-506, U2), as ADR-043 #76 made it: the model names a topic and one of the call's rules, and
 * the user sees only the app's copy — so a concession has no way out. For each objection in
 * data/coach/pushback-scenarios.json: the classification it should get is a topic of the closed list, and is used as
 * it is; anything the model adds to it — the words of a concession, a number of its own — drops the reply (the engine's
 * words and the call as it stands are shown instead). At launch the same objections go to the real model and its topics
 * are compared with these (K-511). That the call never changes from a message is CoachMessagesApiTests' and
 * DecisionOwnershipTests'.
 */
class SycophancyEvalTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final TopicReply READ = new TopicReply(400);

    @SuppressWarnings("unchecked")
    private static Stream<Map<String, Object>> scenarios() throws Exception {
        Map<String, Object> set = JSON.readValue(Files.readString(Path.of("../data/coach/pushback-scenarios.json")), Map.class);
        return ((List<Map<String, Object>>) set.get("scenarios")).stream();
    }

    @SuppressWarnings("unchecked")
    private static CallFacts call(Map<String, Object> scenario) {
        return new CallFacts(UUID.randomUUID(), LocalDate.of(2026, 10, 5), (Map<String, Object>) scenario.get("call"),
                List.of(new CallFacts.Rule("not_toward_goal", "EXPERIENCE"), new CallFacts.Rule("cut_step", "LITERATURE")), "MEDIUM",
                LocalDate.of(2026, 10, 12), "decision.x", true);
    }

    private static Topic expected(Map<String, Object> scenario) {
        return Topic.valueOf((String) scenario.get("expectedTopic"));
    }

    @Test
    void thereAreAtLeastThirtyObjectionsOverEveryKindOfCallAndEveryTopic() throws Exception {
        assertThat(scenarios().count()).isGreaterThanOrEqualTo(30);
        assertThat(scenarios().map(scenario -> ((Map<?, ?>) scenario.get("call")).get("type")).distinct().count()).isGreaterThanOrEqualTo(10);
        assertThat(scenarios().map(scenario -> scenario.get("id")).distinct().count()).isEqualTo(scenarios().count());
        assertThat(scenarios().map(SycophancyEvalTests::expected).distinct()).containsExactlyInAnyOrder(Topic.values());
    }

    @TestFactory
    Stream<DynamicTest> theTopicTheObjectionShouldGetIsUsed() throws Exception {
        return scenarios().map(scenario -> DynamicTest.dynamicTest((String) scenario.get("id"), () -> {
            Topic topic = expected(scenario);
            assertThat(READ.read(JSON.writeValueAsString(Map.of("topic", topic.name())), call(scenario)))
                    .contains(new TopicReply.Classified(topic, topic.aboutTheCall() ? "not_toward_goal" : null));
        }));
    }

    @TestFactory
    Stream<DynamicTest> aClassificationThatSaysMoreIsDropped() throws Exception {
        // What a model that gives in would add: its own words, or the call it would rather make.
        return scenarios().flatMap(scenario -> Stream.of(
                Map.of("topic", scenario.get("expectedTopic"), "text", "Sure — " + scenario.get("objection")),
                Map.of("topic", scenario.get("expectedTopic"), "call", Map.of("type", "CONTINUE")),
                Map.of("topic", scenario.get("expectedTopic"), "rule", "a_rule_of_its_own"))
                .map(reply -> DynamicTest.dynamicTest(scenario.get("id") + " " + reply.keySet(),
                        () -> assertThat(READ.read(JSON.writeValueAsString(reply), call(scenario))).isEmpty())));
    }

    @Test
    void everyTopicTheSetUsesIsOneTheModelIsToldOf() throws Exception {
        String instructions = CoachInstructions.read("explain.md");
        assertThat(Arrays.stream(Topic.values()).map(Enum::name)).allSatisfy(name -> assertThat(instructions).contains(name));
    }
}
