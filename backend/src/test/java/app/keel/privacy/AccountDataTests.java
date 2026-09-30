package app.keel.privacy;

import static org.assertj.core.api.Assertions.assertThat;

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
    void theExportHoldsEverythingHeldAndNothingOfAnyoneElse() throws Exception {
        AccountId account = accountWithDataEverywhere();
        // Any stored date is exported, not only the ones after 1970 (K-214 review): ApiLimits accepts years from 1900.
        send(account, "POST", "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt", "1926-09-30T05:00:00Z", "kg", 82.4,
                "source", "MANUAL"));
        send(account, "POST", "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", "1926-09-30T15:00:00Z"));
        send(account, "PUT", "/v1/consents/THIRD_PARTY_AI", Map.of("textVersion", "1-draft", "provider", "Example AI",
                "dataTypes", List.of("meal photo", "meal note")));
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
        assertThat((List<?>) ((Map<String, Object>) sections.get("nutrition")).get("meals")).hasSize(1);
        Map<String, Object> decision = (Map<String, Object>) sections.get("decision");
        assertThat((Map<String, Object>) decision.get("plan")).containsEntry("phase", "CUT");
        assertThat((List<Map<String, Object>>) decision.get("calls")).singleElement().satisfies(call -> {
            assertThat(call).containsKeys("weekOf", "action", "snapshot");
            assertThat((List<?>) ((Map<String, Object>) call.get("snapshot")).get("weights")).isNotEmpty();
        });
        // U4: the fat estimate is an engine input and never leaves as a number, not even in the user's own export.
        assertThat(body).doesNotContainIgnoringCase("fatProxy");
        // The AI consent is the provider and the data it may send (V2): both halves of what the user agreed to.
        assertThat((List<Map<String, Object>>) ((Map<String, Object>) sections.get("consent")).get("events"))
                .anySatisfy(event -> assertThat(event).containsEntry("provider", "Example AI")
                        .containsEntry("dataTypes", List.of("meal photo", "meal note")));
        assertThat(body).doesNotContain("93.7", "111.3", "12345", bystanderSubject, bystander.value().toString());
    }

    /** Rows per schema.table with an account_id column, for this account. */
    private Map<String, Integer> rowsOf(AccountId account) {
        List<String> tables = jdbc.sql("""
                select table_schema || '.' || table_name from information_schema.columns
                where column_name = 'account_id' and table_schema not in ('public', 'pg_catalog', 'information_schema')
                order by 1""").query(String.class).list();
        Map<String, Integer> rows = new java.util.TreeMap<>();
        for (String table : tables) {
            rows.put(table, jdbc.sql("select count(*) from " + table + " where account_id = :account")
                    .param("account", account.value()).query(Integer.class).single());
        }
        // identity.account is keyed by id, not account_id.
        rows.put("identity.account", jdbc.sql("select count(*) from identity.account where id = :account")
                .param("account", account.value()).query(Integer.class).single());
        return rows;
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

    /** An account as a real one would be: signed in through Apple, then data in every module. */
    private AccountId accountWithDataEverywhere() throws Exception {
        AccountId account = new AccountId(UUID.fromString(jdbc.sql("""
                insert into identity.account (id, apple_subject, created_at) values (gen_random_uuid(), :subject, now()) returning id""")
                .param("subject", "apple." + UUID.randomUUID()).query(String.class).single()));
        jdbc.sql("""
                insert into identity.refresh_token (id, account_id, family_id, token_hash, expires_at, created_at)
                values (gen_random_uuid(), :account, gen_random_uuid(), :hash, now() + interval '1 day', now())""")
                .param("account", account.value()).param("hash", UUID.randomUUID().toString()).update();
        send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", "1-draft"));
        send(account, "PUT", "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")));
        send(account, "POST", "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt", "2026-09-30T05:00:00Z", "kg", 82.4,
                "source", "MANUAL"));
        send(account, "POST", "/v1/waist-measurements", Map.of("clientId", UUID.randomUUID(), "measuredOn", "2026-09-30", "cm", 88));
        send(account, "POST", "/v1/photo-checks", Map.of("clientId", UUID.randomUUID(), "takenOn", "2026-09-30", "look", "SAME"));
        send(account, "POST", "/v1/body-looks", Map.of("clientId", UUID.randomUUID(), "takenOn", "2026-09-30", "level", 3));
        send(account, "PUT", "/v1/activity-days", Map.of("day", "2026-09-30", "steps", 8000));
        send(account, "POST", "/v1/program/generate", Map.of("trainingDays", List.of("MONDAY", "THURSDAY")));
        // A call of the deload ladder on the program (K-217), as decision applies it.
        context.getBean(app.keel.training.TrainingCalls.class).holdLoad(account, UUID.randomUUID(), java.time.LocalDate.of(2026, 9, 28));
        jdbc.sql("insert into nutrition.food (id, name, source, kcal, protein_g, carbs_g, fat_g) values ('fdc:171477', 'Chicken breast, roasted', 'FOUNDATION', 165, 31, 0, 3.6) on conflict (id) do nothing").update();
        send(account, "POST", "/v1/meals", Map.of("clientId", UUID.randomUUID(), "eatenAt", "2026-09-30T12:30:00Z", "slot", "LUNCH",
                "items", List.of(Map.of("foodId", "fdc:171477", "amount", Map.of("quantity", 200, "unit", "g")))));
        // This week's check-in (Mondays, UTC): the plan and the call (K-212).
        send(account, "POST", "/v1/check-ins/current/answers", Map.of("clientId", UUID.randomUUID(), "answers", List.of(),
                "weekOf", java.time.LocalDate.now(java.time.ZoneOffset.UTC).with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY)).toString()));
        MvcTestResult workout = send(account, "POST", "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", "2026-09-30T15:00:00Z"));
        String id = (String) JSON.readValue(workout.getResponse().getContentAsString(), Map.class).get("id");
        send(account, "POST", "/v1/workouts/" + id + "/sets", Map.of("clientId", UUID.randomUUID(), "exerciseId", "bench_press",
                "setType", "WORKING", "loadKg", 80, "reps", 8, "rir", 1));
        return account;
    }

    private MvcTestResult send(AccountId account, String method, String uri, Object body) {
        var request = "PUT".equals(method) ? mvc.put() : mvc.post();
        MvcTestResult result = request.uri(uri).header("Authorization", bearer(account)).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(body)).exchange();
        assertThat(result.getResponse().getStatus()).as(method + " " + uri).isLessThan(300);
        return result;
    }

    private String bearer(AccountId account) {
        return TestSessions.bearer(context, account);
    }
}
