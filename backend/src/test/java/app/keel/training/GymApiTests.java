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
        UUID othersOwn = UUID.randomUUID();
        send(owner, "PUT", "/v1/gyms/" + id, gym("Downtown", true));
        send(other, "PUT", "/v1/gyms/" + othersOwn, gym("Home", true));

        assertThat(list(send(other, "GET", "/v1/gyms", null))).singleElement().satisfies(gym -> assertThat(gym).containsEntry("name", "Home"));
        assertThat(send(other, "PUT", "/v1/gyms/" + id, gym("Mine now", true))).hasStatus(409);
        // Refused, it changes nothing of the sender's either.
        assertThat(list(send(other, "GET", "/v1/gyms", null))).singleElement().satisfies(gym -> assertThat(gym).containsEntry("current", true));
        send(other, "DELETE", "/v1/gyms/" + id, null);
        assertThat(list(send(owner, "GET", "/v1/gyms", null))).singleElement().satisfies(gym -> assertThat(gym).containsEntry("name", "Downtown"));
    }

    @Test
    void twoGymsMadeCurrentAtOnceLeaveOneInUseAndNeitherFails() throws Exception {
        // A queue flush after a day offline sends the phone's gym writes together (ADR-032): both stored, one in use.
        for (int round = 0; round < 5; round++) {
            AccountId account = TestSessions.newAccount();
            var pool = java.util.concurrent.Executors.newFixedThreadPool(2);
            var first = pool.submit(() -> send(account, "PUT", "/v1/gyms/" + UUID.randomUUID(), gym("Downtown", true)).getResponse().getStatus());
            var second = pool.submit(() -> send(account, "PUT", "/v1/gyms/" + UUID.randomUUID(), gym("Home", true)).getResponse().getStatus());
            assertThat(List.of(first.get(), second.get())).as("round " + round).containsOnly(200);
            pool.shutdown();
            assertThat(list(send(account, "GET", "/v1/gyms", null))).filteredOn(gym -> Boolean.TRUE.equals(gym.get("current"))).hasSize(1);
        }
    }

    @Test
    void twoNewGymsAtTheCeilingAtOnceStoreOneAndRefuseTheOther() throws Exception {
        int ceiling = context.getBean(GymLimits.class).gyms();
        AccountId account = TestSessions.newAccount();
        for (int i = 0; i < ceiling - 1; i++) {
            send(account, "PUT", "/v1/gyms/" + UUID.randomUUID(), gym("Gym " + i, false));
        }
        var pool = java.util.concurrent.Executors.newFixedThreadPool(2);
        var first = pool.submit(() -> send(account, "PUT", "/v1/gyms/" + UUID.randomUUID(), gym("One", false)).getResponse().getStatus());
        var second = pool.submit(() -> send(account, "PUT", "/v1/gyms/" + UUID.randomUUID(), gym("Two", false)).getResponse().getStatus());

        assertThat(List.of(first.get(), second.get())).containsExactlyInAnyOrder(200, 400);
        pool.shutdown();
        assertThat(list(send(account, "GET", "/v1/gyms", null))).hasSize(ceiling);
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

        String inUse = (String) list(send(account, "GET", "/v1/gyms", null)).getFirst().get("id");
        send(account, "PUT", "/v1/gyms/" + inUse, gym("In use", true));

        // Refused, it changes nothing: the gym in use stays in use.
        assertThat(send(account, "PUT", "/v1/gyms/" + UUID.randomUUID(), gym("One more", true))).hasStatus(400);
        assertThat(list(send(account, "GET", "/v1/gyms", null))).hasSize(ceiling).filteredOn(gym -> Boolean.TRUE.equals(gym.get("current")))
                .singleElement().satisfies(gym -> assertThat(gym).containsEntry("id", inUse));
        // Replacing one already there is not one more.
        assertThat(send(account, "PUT", "/v1/gyms/" + inUse, gym("Renamed", true))).hasStatusOk();
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
