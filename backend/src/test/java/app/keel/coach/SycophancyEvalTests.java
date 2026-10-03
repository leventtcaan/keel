package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.decision.CallFacts;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestFactory;
import tools.jackson.databind.json.JsonMapper;

/**
 * The coach that says no (K-506, U2): for each objection in data/coach/pushback-scenarios.json, a reply that gives in —
 * a new number, a promise to change, skip or soften the call — is dropped (the engine's words and the call as it stands
 * are shown instead), and a reply that tells the call as it stands is shown. With the fake model in CI; at launch the
 * same objections go to the real one (ADR-041). That the call itself never changes from a message is
 * CoachMessagesApiTests' and DecisionOwnershipTests' (the coach builds no decision).
 */
class SycophancyEvalTests {

    private static final ReplyCheck CHECK = ReplyCheck.fromClasspath(400);

    @SuppressWarnings("unchecked")
    private static Map<String, Object> set() throws Exception {
        return JsonMapper.builder().build().readValue(Files.readString(Path.of("../data/coach/pushback-scenarios.json")), Map.class);
    }

    @SuppressWarnings("unchecked")
    private static Stream<Map<String, Object>> scenarios() throws Exception {
        return ((List<Map<String, Object>>) set().get("scenarios")).stream();
    }

    @SuppressWarnings("unchecked")
    private static CallFacts call(Map<String, Object> scenario) throws Exception {
        return new CallFacts(UUID.randomUUID(), LocalDate.parse((String) set().get("nextReview")).minusDays(7), (Map<String, Object>) scenario.get("call"),
                List.of(), "MEDIUM", LocalDate.parse((String) set().get("nextReview")), "decision.x", true);
    }

    private static String reply(Object text) {
        return JsonMapper.builder().build().writeValueAsString(Map.of("text", text));
    }

    @Test
    void thereAreAtLeastThirtyObjectionsOverEveryKindOfCallTheCoachTells() throws Exception {
        assertThat(scenarios().count()).isGreaterThanOrEqualTo(30);
        assertThat(scenarios().map(scenario -> ((Map<?, ?>) scenario.get("call")).get("type")).distinct().count()).isGreaterThanOrEqualTo(10);
        assertThat(scenarios().map(scenario -> scenario.get("id")).distinct().count()).isEqualTo(scenarios().count());
    }

    @TestFactory
    Stream<DynamicTest> aReplyThatGivesInIsDropped() throws Exception {
        return scenarios().map(scenario -> DynamicTest.dynamicTest((String) scenario.get("id"),
                () -> assertThat(CHECK.read(reply(scenario.get("sycophantic")), call(scenario))).as((String) scenario.get("sycophantic")).isEmpty()));
    }

    @TestFactory
    Stream<DynamicTest> aReplyThatKeepsTheCallIsShown() throws Exception {
        return scenarios().map(scenario -> DynamicTest.dynamicTest((String) scenario.get("id"),
                () -> assertThat(CHECK.read(reply(scenario.get("faithful")), call(scenario))).as((String) scenario.get("faithful")).isPresent()));
    }
}
