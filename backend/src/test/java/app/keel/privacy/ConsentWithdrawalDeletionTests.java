package app.keel.privacy;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentGate;
import app.keel.consent.ConsentKind;
import app.keel.consent.ConsentTextVersions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/**
 * Withdrawing a consent deletes the data it covered (K-231, ADR-028 #21, GDPR Art. 17(1)(b)). The health data consent
 * covers every weigh-in, waist, photo check, look, activity day, meal, weekly call and plan, and the foods to avoid;
 * training is not health data (ADR-007) and stays, as do the account and the consent record itself. The withdrawal and
 * the deletion are one transaction: either both happen or neither, so a failure is simply tried again. Some minutes
 * later a second pass deletes what a write already in flight added — unless the consent was given again by then.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
@ExtendWith(OutputCaptureExtension.class)
class ConsentWithdrawalDeletionTests {

    /** The schemas whose every account row is health data; a module added later that keeps health data joins here. */
    private static final List<String> HEALTH_SCHEMAS = List.of("measurement.", "nutrition.", "decision.");

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Autowired
    ConsentGate gate;

    @Test
    void withdrawingTheHealthDataConsentDeletesTheHealthDataAtOnceAndNothingElse(CapturedOutput output) throws Exception {
        AccountId account = fixture().withDataEverywhere();
        AccountId bystander = fixture().withDataEverywhere();
        Map<String, Integer> before = fixture().rowsOf(account);

        MvcTestResult result = withdraw(account, "HEALTH_DATA", true);

        assertThat(result).hasStatusOk().bodyJson().extractingPath("$.status").isEqualTo("WITHDRAWN");
        // At once: in the withdrawal's own transaction, not some time after it answered.
        Map<String, Integer> after = fixture().rowsOf(account);
        assertThat(after).as("the withdrawal itself is kept").containsEntry("consent.consent_event", before.get("consent.consent_event") + 1);
        after.remove("consent.consent_event");
        assertThat(after).allSatisfy((table, rows) -> {
            if (health(table)) {
                assertThat(rows).as(table + " is health data").isZero();
            } else {
                assertThat(rows).as(table + " is not covered by the consent").isEqualTo(before.get(table));
            }
        });
        assertThat(after.get("training.workout")).as("training stays (ADR-007)").isPositive();
        assertThat(after.get("profile.profile")).as("the profile stays, without the foods to avoid").isOne();
        assertThat(foodsToAvoid(account)).isNull();
        assertThat(budgetNote(account)).isEqualTo("student budget");
        assertThat(fixture().rowsOf(bystander)).as("another account").allSatisfy((table, rows) -> assertThat(rows).isPositive());
        assertThat(foodsToAvoid(bystander)).isEqualTo("{peanuts}");
        // V3: the deletion leaves no health data in the log.
        assertThat(output.getAll()).doesNotContain("82.4", "peanuts");
    }

    @Test
    void withdrawingTheHealthDataConsentEndsAHeldLoadSoTheTrainingGoesOn() throws Exception {
        // K-428 (ADR-037 #34): the calls are deleted with the consent, so no call would come to end the deload ladder's
        // first rung; the load would stay held for good. The hold ends with the withdrawal; the ladder starts again from
        // its own observation once the consent is given again.
        AccountId account = fixture().withDataEverywhere();
        assertThat(program(account)).containsKey("loadHeldSince");

        assertThat(withdraw(account, "HEALTH_DATA", true)).hasStatusOk();

        assertThat(program(account)).doesNotContainKey("loadHeldSince");
        assertThat(fixture().rowsOf(account).get("training.program_change")).as("training stays (ADR-007): the hold ends, its record stays").isOne();
    }

    @Test
    void theApiAsksForTheDeletionToBeConfirmed() throws Exception {
        AccountId account = fixture().withDataEverywhere();
        Map<String, Integer> before = fixture().rowsOf(account);

        assertThat(withdraw(account, "HEALTH_DATA", false)).hasStatus(400).bodyJson().extractingPath("$.code").isEqualTo("VALIDATION_FAILED");
        assertThat(mvc.delete().uri("/v1/consents/HEALTH_DATA").header("Authorization", fixture().bearer(account)).exchange())
                .as("no confirmation at all").hasStatus(400);

        assertThat(gate.granted(account, ConsentKind.HEALTH_DATA)).as("still given").isTrue();
        assertThat(fixture().rowsOf(account)).isEqualTo(before);
    }

    @Test
    void theOtherConsentsCoverNoStoredDataAndDeleteNothing() throws Exception {
        AccountId account = fixture().withDataEverywhere();
        fixture().send(account, "PUT", "/v1/consents/APPLE_HEALTH", Map.of("textVersion", ConsentTextVersions.APPLE_HEALTH));
        Map<String, Integer> before = fixture().rowsOf(account);

        assertThat(withdraw(account, "APPLE_HEALTH", false)).hasStatusOk().bodyJson().extractingPath("$.status").isEqualTo("WITHDRAWN");

        Map<String, Integer> after = fixture().rowsOf(account);
        assertThat(after).as("only the withdrawal itself is new").containsEntry("consent.consent_event", before.get("consent.consent_event") + 1);
        after.remove("consent.consent_event");
        before.remove("consent.consent_event");
        assertThat(after).isEqualTo(before);
    }

    @Test
    void aModuleThatFailsToDeleteUndoesTheWithdrawalSoItCanBeTriedAgain() throws Exception {
        AccountId account = fixture().withDataEverywhere();
        Map<String, Integer> before = fixture().rowsOf(account);
        // One module's deletion fails — after the others have deleted.
        jdbc.sql("""
                create or replace function k231_refuse_meal_delete() returns trigger language plpgsql as $$
                begin
                    if old.account_id = '%s' then raise exception 'refused for the test'; end if;
                    return old;
                end $$""".formatted(account.value())).update();
        jdbc.sql("create trigger k231_refuse before delete on nutrition.meal for each row execute function k231_refuse_meal_delete()").update();
        try {
            assertThat(withdraw(account, "HEALTH_DATA", true)).hasStatus(500);

            assertThat(gate.granted(account, ConsentKind.HEALTH_DATA)).as("the withdrawal is undone with it").isTrue();
            assertThat(fixture().rowsOf(account)).as("nothing half-deleted").isEqualTo(before);
        } finally {
            jdbc.sql("drop trigger k231_refuse on nutrition.meal").update();
            jdbc.sql("drop function k231_refuse_meal_delete()").update();
        }

        assertThat(withdraw(account, "HEALTH_DATA", true)).as("tried again").hasStatusOk();
        assertThat(fixture().rowsOf(account)).allSatisfy((table, rows) -> {
            if (health(table)) {
                assertThat(rows).as(table).isZero();
            }
        });
    }

    @Test
    void aWriteThatWasInFlightDuringTheWithdrawalGoesInTheSecondPass() throws Exception {
        AccountId account = fixture().withDataEverywhere();
        assertThat(withdraw(account, "HEALTH_DATA", true)).hasStatusOk();
        // A request that was past the consent check when the withdrawal committed, and wrote after the modules had deleted.
        insertWeighIn(account);

        context.getBean(ConsentWithdrawalSweep.class).sweep(Instant.now().plus(Duration.ofDays(1)));

        assertThat(fixture().rowsOf(account).get("measurement.weigh_in")).isZero();
        assertThat(pendingSecondPasses(account)).as("the second pass is the last").isZero();
    }

    @Test
    void theScheduledSecondPassRunsAsTheSweepDoes() throws Exception {
        // The scheduler calls scheduled(), not sweep(): the second pass must run in a transaction there too (K-231 review).
        AccountId account = fixture().withDataEverywhere();
        assertThat(withdraw(account, "HEALTH_DATA", true)).hasStatusOk();
        insertWeighIn(account);
        jdbc.sql("update privacy.consent_withdrawal set withdrawn_at = now() - interval '1 day' where withdrawn_account_id = :account")
                .param("account", account.value()).update();

        context.getBean(ConsentWithdrawalSweep.class).scheduled();

        assertThat(fixture().rowsOf(account).get("measurement.weigh_in")).isZero();
        assertThat(pendingSecondPasses(account)).isZero();
    }

    @Test
    void theSecondPassSparesWhatWasWrittenUnderAConsentGivenAgain() throws Exception {
        AccountId account = fixture().withDataEverywhere();
        assertThat(withdraw(account, "HEALTH_DATA", true)).hasStatusOk();
        fixture().send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA));
        fixture().send(account, "POST", "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt", "2026-10-01T05:00:00Z",
                "kg", 81.9, "source", "MANUAL"));

        context.getBean(ConsentWithdrawalSweep.class).sweep(Instant.now().plus(Duration.ofDays(1)));

        assertThat(fixture().rowsOf(account).get("measurement.weigh_in")).isOne();
        assertThat(pendingSecondPasses(account)).isZero();
    }

    @Test
    void theSecondPassWaitsLongerThanAnyRequestRuns() throws Exception {
        AccountId account = fixture().withDataEverywhere();
        assertThat(withdraw(account, "HEALTH_DATA", true)).hasStatusOk();
        insertWeighIn(account);

        context.getBean(ConsentWithdrawalSweep.class).sweep(Instant.now());

        assertThat(fixture().rowsOf(account).get("measurement.weigh_in")).as("not yet").isOne();
        assertThat(pendingSecondPasses(account)).isOne();
    }

    private MvcTestResult withdraw(AccountId account, String kind, boolean confirm) {
        return mvc.delete().uri("/v1/consents/" + kind + "?confirmDataDeletion=" + confirm).header("Authorization", fixture().bearer(account))
                .exchange();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> program(AccountId account) throws Exception {
        MvcTestResult result = mvc.get().uri("/v1/program").header("Authorization", fixture().bearer(account)).exchange();
        assertThat(result).hasStatusOk();
        return AccountFixture.JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }

    private void insertWeighIn(AccountId account) {
        jdbc.sql("""
                insert into measurement.weigh_in (id, account_id, client_id, measured_at, kg, source)
                values (gen_random_uuid(), :account, gen_random_uuid(), now(), 80.1, 'MANUAL')""")
                .param("account", account.value()).update();
    }

    private int pendingSecondPasses(AccountId account) {
        return jdbc.sql("select count(*) from privacy.consent_withdrawal where withdrawn_account_id = :account")
                .param("account", account.value()).query(Integer.class).single();
    }

    private String foodsToAvoid(AccountId account) {
        return jdbc.sql("select food_avoid::text from profile.profile where account_id = :account").param("account", account.value())
                .query(String.class).optional().orElse(null);
    }

    private String budgetNote(AccountId account) {
        return jdbc.sql("select budget_note from profile.profile where account_id = :account").param("account", account.value())
                .query(String.class).single();
    }

    private static boolean health(String table) {
        return HEALTH_SCHEMAS.stream().anyMatch(table::startsWith);
    }

    private AccountFixture fixture() {
        return new AccountFixture(mvc, context, jdbc);
    }
}
