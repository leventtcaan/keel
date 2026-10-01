package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * The user's gyms (K-414, ADR-032, contract /v1/gyms): stored under the id the phone made, replaced whole, one of them
 * the gym in use. The next session's load is rounded to what that gym can make.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class GymApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Test
    void aGymIsStoredUnderThePhonesIdAndReadBack() throws Exception {
        AccountId account = TestSessions.newAccount();
        UUID id = UUID.randomUUID();

        MvcTestResult stored = send(account, "PUT", "/v1/gyms/" + id, gym("Downtown", true));

        assertThat(stored).hasStatusOk();
        assertThat(map(stored)).containsEntry("id", id.toString()).containsEntry("name", "Downtown").containsEntry("current", true)
                .containsEntry("barKg", 20).containsEntry("platesKg", List.of(20, 10, 2.5, 1.25))
                .containsEntry("dumbbellsKg", List.of(10, 12.5, 15)).containsEntry("stackStepKg", 5)
                .containsEntry("machines", List.of(Map.of("exerciseId", "pec_deck", "stepKg", 7)));
        assertThat(list(send(account, "GET", "/v1/gyms", null))).containsExactly(map(stored));
    }

    @Test
    void theSameIdAgainReplacesTheGymWhole() throws Exception {
        AccountId account = TestSessions.newAccount();
        UUID id = UUID.randomUUID();
        send(account, "PUT", "/v1/gyms/" + id, gym("Downtown", true));

        send(account, "PUT", "/v1/gyms/" + id, Map.of("name", "Home", "current", true, "platesKg", List.of(5), "dumbbellsKg", List.of(),
                "machines", List.of()));

        assertThat(list(send(account, "GET", "/v1/gyms", null))).singleElement().satisfies(gym -> assertThat(gym)
                .containsEntry("name", "Home").containsEntry("platesKg", List.of(5)).containsEntry("dumbbellsKg", List.of())
                .containsEntry("machines", List.of()).doesNotContainKeys("barKg", "stackStepKg"));
    }

    @Test
    void oneGymIsInUseAtATime() throws Exception {
        AccountId account = TestSessions.newAccount();
        UUID downtown = UUID.randomUUID();
        UUID home = UUID.randomUUID();
        send(account, "PUT", "/v1/gyms/" + downtown, gym("Downtown", true));

        send(account, "PUT", "/v1/gyms/" + home, gym("Home", true));

        assertThat(list(send(account, "GET", "/v1/gyms", null))).extracting(gym -> gym.get("name"), gym -> gym.get("current"))
                .containsExactlyInAnyOrder(org.assertj.core.groups.Tuple.tuple("Downtown", false), org.assertj.core.groups.Tuple.tuple("Home", true));
        send(account, "PUT", "/v1/gyms/" + home, gym("Home", false));
        assertThat(list(send(account, "GET", "/v1/gyms", null))).allSatisfy(gym -> assertThat(gym).containsEntry("current", false));
    }

    @Test
    void aGymIsDeletedAndADeletedOneIsDeletedAgainWithoutComplaint() throws Exception {
        AccountId account = TestSessions.newAccount();
        UUID id = UUID.randomUUID();
        send(account, "PUT", "/v1/gyms/" + id, gym("Downtown", true));

        assertThat(send(account, "DELETE", "/v1/gyms/" + id, null)).hasStatus(204);
        assertThat(send(account, "DELETE", "/v1/gyms/" + id, null)).hasStatus(204);
        assertThat(list(send(account, "GET", "/v1/gyms", null))).isEmpty();
    }

    @Test
    void anotherAccountsGymIsNeitherReadNorReplacedNorDeleted() throws Exception {
        AccountId owner = TestSessions.newAccount();
        AccountId other = TestSessions.newAccount();
        UUID id = UUID.randomUUID();
        send(owner, "PUT", "/v1/gyms/" + id, gym("Downtown", true));

        assertThat(list(send(other, "GET", "/v1/gyms", null))).isEmpty();
        assertThat(send(other, "PUT", "/v1/gyms/" + id, gym("Mine now", true))).hasStatus(409);
        send(other, "DELETE", "/v1/gyms/" + id, null);
        assertThat(list(send(owner, "GET", "/v1/gyms", null))).singleElement().satisfies(gym -> assertThat(gym).containsEntry("name", "Downtown"));
    }

    @Test
    void anInvalidGymIsRefusedAndNothingIsStored() throws Exception {
        AccountId account = TestSessions.newAccount();

        assertThat(send(account, "PUT", "/v1/gyms/" + UUID.randomUUID(), Map.of("name", "Downtown", "current", true, "platesKg", List.of(20, 20),
                "dumbbellsKg", List.of(), "machines", List.of()))).as("a plate twice").hasStatus(400);
        assertThat(send(account, "PUT", "/v1/gyms/" + UUID.randomUUID(), Map.of("current", true, "platesKg", List.of(),
                "dumbbellsKg", List.of(), "machines", List.of()))).as("no name").hasStatus(400);
        assertThat(list(send(account, "GET", "/v1/gyms", null))).isEmpty();
    }

    @Test
    void anAccountKeepsAtMostItsCeilingOfGyms() throws Exception {
        AccountId account = TestSessions.newAccount();
        int ceiling = context.getBean(GymLimits.class).gyms();
        for (int i = 0; i < ceiling; i++) {
            assertThat(send(account, "PUT", "/v1/gyms/" + UUID.randomUUID(), gym("Gym " + i, false))).hasStatusOk();
        }

        assertThat(send(account, "PUT", "/v1/gyms/" + UUID.randomUUID(), gym("One more", false))).hasStatus(400);
        // Replacing one already there is not one more.
        String first = (String) list(send(account, "GET", "/v1/gyms", null)).getFirst().get("id");
        assertThat(send(account, "PUT", "/v1/gyms/" + first, gym("Renamed", false))).hasStatusOk();
    }

    private static Map<String, Object> gym(String name, boolean current) {
        return Map.of("name", name, "current", current, "barKg", 20, "platesKg", List.of(20, 10, 2.5, 1.25), "dumbbellsKg", List.of(10, 12.5, 15),
                "stackStepKg", 5, "machines", List.of(Map.of("exerciseId", "pec_deck", "stepKg", 7)));
    }

    private MvcTestResult send(AccountId account, String method, String uri, Object body) {
        var request = switch (method) {
            case "GET" -> mvc.get();
            case "PUT" -> mvc.put();
            case "DELETE" -> mvc.delete();
            default -> mvc.post();
        };
        request = request.uri(uri).header("Authorization", TestSessions.bearer(context, account));
        if (body != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(body));
        }
        return request.exchange();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(MvcTestResult result) throws Exception {
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> list(MvcTestResult result) throws Exception {
        return JSON.readValue(result.getResponse().getContentAsString(), List.class);
    }
}
