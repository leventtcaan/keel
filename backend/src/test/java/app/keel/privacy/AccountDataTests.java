package app.keel.privacy;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.Duration;
import java.time.Instant;
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
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * The user's data, whole (K-214, V6): deleting the account removes every row of it in every module — checked against
 * the database itself, so a module added later with an account_id column is covered without touching this test — and
 * the export hands back everything held, one section per module.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class AccountDataTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final Duration PATIENCE = Duration.ofSeconds(10);

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Test
    void deletingTheAccountLeavesNothingOfItInAnyModule() throws Exception {
        AccountId account = accountWithDataEverywhere();
        AccountId bystander = accountWithDataEverywhere();
        assertThat(rowsOf(account)).as("the test fills every module").allSatisfy((table, rows) -> assertThat(rows).isPositive());

        assertThat(mvc.delete().uri("/v1/account").header("Authorization", bearer(account)).exchange()).hasStatus(202);

        awaitNoRowsOf(account);
        assertThat(rowsOf(bystander).values()).allSatisfy(rows -> assertThat(rows).isPositive());
    }

    @Test
    void theExportHoldsEveryModulesDataAndOnlyTheUsers() throws Exception {
        AccountId account = accountWithDataEverywhere();
        accountWithDataEverywhere();

        MvcTestResult result = mvc.get().uri("/v1/account/export").header("Authorization", bearer(account)).exchange();

        assertThat(result).hasStatusOk();
        Map<String, Object> export = JSON.readValue(result.getResponse().getContentAsString(), Map.class);
        Map<String, Object> sections = (Map<String, Object>) export.get("sections");
        assertThat(export).containsKey("exportedAt");
        // One section per schema that holds account rows: nothing held is missing from the export.
        assertThat(sections.keySet()).containsAll(rowsOf(account).keySet().stream().map(table -> table.substring(0, table.indexOf('.'))).toList());
        assertThat(((List<?>) ((Map<String, Object>) sections.get("measurement")).get("weighIns"))).hasSize(1);
        assertThat(((List<?>) ((Map<String, Object>) sections.get("training")).get("workouts"))).hasSize(1);
    }

    @Test
    void theExportIsNotAnotherAccounts() throws Exception {
        AccountId someone = accountWithDataEverywhere();
        AccountId empty = TestSessions.newAccount();

        MvcTestResult result = mvc.get().uri("/v1/account/export").header("Authorization", bearer(empty)).exchange();

        assertThat(result.getResponse().getContentAsString()).doesNotContain(someone.value().toString());
    }

    @Test
    void aDeletedAccountsTokenIsRefusedAtOnce() throws Exception {
        // The access token lives minutes (ADR-025); a queued offline write sent with it after the deletion would land
        // under an id nothing would ever delete again (K-214 review).
        AccountId account = accountWithDataEverywhere();
        String token = bearer(account);

        assertThat(mvc.delete().uri("/v1/account").header("Authorization", token).exchange()).hasStatus(202);

        assertThat(mvc.post().uri("/v1/workouts").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(Map.of("clientId", UUID.randomUUID(), "startedAt", "2026-09-30T16:00:00Z")))
                .exchange()).hasStatus(401);
        awaitNoRowsOf(account);
    }

    @Test
    void aWriteThatWasInFlightDuringTheDeletionGoesInTheSecondPass() throws Exception {
        AccountId account = accountWithDataEverywhere();
        assertThat(mvc.delete().uri("/v1/account").header("Authorization", bearer(account)).exchange()).hasStatus(202);
        awaitNoRowsOf(account);
        // A request that was past the token check when the deletion committed, and wrote after the modules had deleted.
        jdbc.sql("insert into training.workout (id, account_id, client_id, started_at) values (gen_random_uuid(), :account, gen_random_uuid(), now())")
                .param("account", account.value()).update();

        context.getBean(DeletionSweep.class).sweep(Instant.now().plus(Duration.ofDays(1)));

        awaitNoRowsOf(account);
        assertThat(jdbc.sql("select count(*) from privacy.deletion where deleted_account_id = :account").param("account", account.value())
                .query(Integer.class).single()).as("the second pass is the last").isZero();
    }

    @Test
    void theScheduledSecondPassDeletesTooNotOnlyTheSweepCalledDirectly() throws Exception {
        // K-231 review: the scheduler calls scheduled(); calling sweep() from inside the bean skipped its @Transactional,
        // and a module listener runs only after a transaction commits — so the scheduled second pass deleted nothing.
        AccountId account = accountWithDataEverywhere();
        assertThat(mvc.delete().uri("/v1/account").header("Authorization", bearer(account)).exchange()).hasStatus(202);
        awaitNoRowsOf(account);
        jdbc.sql("insert into training.workout (id, account_id, client_id, started_at) values (gen_random_uuid(), :account, gen_random_uuid(), now())")
                .param("account", account.value()).update();
        jdbc.sql("update privacy.deletion set requested_at = now() - interval '1 day' where deleted_account_id = :account")
                .param("account", account.value()).update();

        context.getBean(DeletionSweep.class).scheduled();

        awaitNoRowsOf(account);
    }

    @Test
    void theExportHoldsEverythingHeldAndNothingOfAnyoneElse() throws Exception {
        AccountId account = accountWithDataEverywhere();
        // Any stored date is exported, not only the ones after 1970 (K-214 review): ApiLimits accepts years from 1900.
        send(account, "POST", "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt", "1926-09-30T05:00:00Z", "kg", 82.4,
                "source", "MANUAL"));
        send(account, "POST", "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", "1926-09-30T15:00:00Z"));
        send(account, "PUT", "/v1/consents/THIRD_PARTY_AI", Map.of("textVersion", ConsentTextVersions.THIRD_PARTY_AI, "provider", "Example AI",
                "dataTypes", List.of("meal photo", "meal note", "coach question")));
        AccountId bystander = accountWithDataEverywhere();
        // What only the bystander has: none of it may appear in the user's export.
        send(bystander, "POST", "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt", "2026-09-29T05:00:00Z", "kg", 93.7,
                "source", "MANUAL"));
        send(bystander, "POST", "/v1/waist-measurements", Map.of("clientId", UUID.randomUUID(), "measuredOn", "2026-09-29", "cm", 111.3));
        send(bystander, "PUT", "/v1/activity-days", Map.of("day", "2026-09-29", "steps", 12345));
        String bystanderSubject = jdbc.sql("select apple_subject from identity.account where id = :id").param("id", bystander.value())
                .query(String.class).single();

        MvcTestResult result = mvc.get().uri("/v1/account/export").header("Authorization", bearer(account)).exchange();

        assertThat(result).hasStatusOk();
        String body = result.getResponse().getContentAsString();
        Map<String, Object> sections = (Map<String, Object>) JSON.readValue(body, Map.class).get("sections");
        Map<String, Object> measurement = (Map<String, Object>) sections.get("measurement");
        assertThat((List<?>) measurement.get("weighIns")).hasSize(2);
        assertThat((List<?>) measurement.get("waistMeasurements")).hasSize(1);
        assertThat((List<?>) measurement.get("photoChecks")).hasSize(1);
        assertThat((List<?>) measurement.get("activityDays")).hasSize(1);
        assertThat((List<?>) ((Map<String, Object>) sections.get("training")).get("workouts")).hasSize(2);
        assertThat((Map<String, Object>) ((Map<String, Object>) sections.get("training")).get("program")).containsEntry("source", "GENERATED");
        assertThat((List<?>) ((Map<String, Object>) sections.get("training")).get("programChanges")).hasSize(1);
        assertThat((List<Map<String, Object>>) ((Map<String, Object>) sections.get("training")).get("gyms")).singleElement()
                .satisfies(gym -> assertThat(gym).containsEntry("name", "Downtown"));
        assertThat((List<Map<String, Object>>) ((Map<String, Object>) sections.get("training")).get("customExercises")).singleElement()
                .satisfies(move -> assertThat(move).containsEntry("name", "Landmine press"));
        assertThat((List<?>) ((Map<String, Object>) sections.get("nutrition")).get("meals")).hasSize(1);
        // The recipe as it was entered (K-413): its ingredients, no number (ADR-034).
        assertThat((List<Map<String, Object>>) ((Map<String, Object>) sections.get("nutrition")).get("recipes")).singleElement()
                .satisfies(recipe -> assertThat(recipe).containsEntry("name", "Chicken bowl").containsEntry("portions", 2));
        Map<String, Object> decision = (Map<String, Object>) sections.get("decision");
        assertThat((Map<String, Object>) decision.get("plan")).containsEntry("phase", "CUT");
        assertThat((List<Map<String, Object>>) decision.get("calls")).singleElement().satisfies(call -> {
            assertThat(call).containsKeys("weekOf", "action", "snapshot");
            assertThat((List<?>) ((Map<String, Object>) call.get("snapshot")).get("weights")).isNotEmpty();
        });
        // The state the fixture declared (K-516): sickness is health data, and the user's own (GDPR Art. 15, 20).
        assertThat((List<Map<String, Object>>) decision.get("declaredStates")).singleElement()
                .satisfies(state -> assertThat(state).containsEntry("kind", "SICK").containsKey("since").doesNotContainKey("until")
                        .doesNotContainKey("stillSoOn"));
        // U4: the fat estimate is an engine input and never leaves as a number, not even in the user's own export.
        assertThat(body).doesNotContainIgnoringCase("fatProxy");
        // A call's reasons go out with the kind of source only (K-523, ADR-041 #72): no research path, even to the user.
        assertThat(body).doesNotContain("arastirma/");
        // The AI consent is the provider and the data it may send (V2): both halves of what the user agreed to.
        assertThat((List<Map<String, Object>>) ((Map<String, Object>) sections.get("consent")).get("events"))
                .anySatisfy(event -> assertThat(event).containsEntry("provider", "Example AI")
                        .containsEntry("dataTypes", List.of("meal photo", "meal note", "coach question")));
        assertThat(body).doesNotContain("93.7", "111.3", "12345", bystanderSubject, bystander.value().toString());
    }

    private void awaitNoRowsOf(AccountId account) throws InterruptedException {
        Instant deadline = Instant.now().plus(PATIENCE);
        Map<String, Integer> left = rowsOf(account);
        while (left.values().stream().anyMatch(rows -> rows > 0) && Instant.now().isBefore(deadline)) {
            Thread.sleep(50);
            left = rowsOf(account);
        }
        assertThat(left).as("rows left after deletion").allSatisfy((table, rows) -> assertThat(rows).as(table).isZero());
    }

    private AccountFixture fixture() {
        return new AccountFixture(mvc, context, jdbc);
    }

    private AccountId accountWithDataEverywhere() throws Exception {
        return fixture().withDataEverywhere();
    }

    private Map<String, Integer> rowsOf(AccountId account) {
        return fixture().rowsOf(account);
    }

    private MvcTestResult send(AccountId account, String method, String uri, Object body) {
        return fixture().send(account, method, uri, body);
    }

    private String bearer(AccountId account) {
        return TestSessions.bearer(context, account);
    }
}
