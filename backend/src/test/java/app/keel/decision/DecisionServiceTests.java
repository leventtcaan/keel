package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.DecisionPipeline;
import app.keel.engine.ParameterSet;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneOffset;
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
 * The weekly check-in (K-212, ADR-003): the Snapshot is built from the modules' APIs, the engine makes the call, and
 * the call is kept with its Snapshot and the parameters' hash — the same Snapshot makes the same call again.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class DecisionServiceTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Autowired
    ParameterSet parameters;

    @Test
    void theFirstCheckInStartsThePlanAndKeepsTheCall() throws Exception {
        AccountId account = ready("LOSE_FAT");

        MvcTestResult result = answer(account, UUID.randomUUID(), thisWeek(), List.of());

        assertThat(result).hasStatusOk();
        Map<String, Object> call = map(result);
        assertThat(call).containsKeys("id", "madeOn", "action", "reasons", "confidence", "nextReview", "copyKey", "application");
        assertThat(call.get("madeOn")).isEqualTo(LocalDate.now(ZoneOffset.UTC).toString());
        Map<String, Object> plan = jdbc.sql("select phase, observing_maintenance, target_kcal from decision.plan where account_id = :a")
                .param("a", account.value()).query().singleRow();
        // LOSE_FAT is a cut; the target starts at the maintenance estimate, watched before it is judged (K-114).
        assertThat(plan).containsEntry("phase", "CUT").containsEntry("observing_maintenance", true);
        assertThat((Integer) plan.get("target_kcal")).isPositive();
        assertThat(jdbc.sql("select parameters_hash from decision.weekly_call where account_id = :a").param("a", account.value())
                .query(String.class).single()).isEqualTo(parameters.versionHash());
    }

    @Test
    void theSameAnswersSentAgainGetTheSameCallAndTheEngineDoesNotRunTwice() throws Exception {
        AccountId account = ready("LOSE_FAT");
        UUID clientId = UUID.randomUUID();

        Map<String, Object> first = map(answer(account, clientId, thisWeek(), List.of()));
        MvcTestResult again = answer(account, clientId, thisWeek(), List.of());

        assertThat(again).hasStatusOk();
        assertThat(map(again)).isEqualTo(first);
        assertThat(jdbc.sql("select count(*) from decision.weekly_call where account_id = :a").param("a", account.value())
                .query(Integer.class).single()).isOne();
    }

    @Test
    void aWeekHasOneCallAndOnlyTheCurrentWeekIsAnswered() {
        AccountId account = ready("LOSE_FAT");
        answer(account, UUID.randomUUID(), thisWeek(), List.of());

        assertThat(answer(account, UUID.randomUUID(), thisWeek(), List.of())).as("a second call this week").hasStatus(409);
        assertThat(answer(ready("LOSE_FAT"), UUID.randomUUID(), thisWeek().minusWeeks(1), List.of())).as("last week").hasStatus(409);
    }

    @Test
    void theCheckInNeedsItsConsentAProfileAndADirection() {
        AccountId noConsent = TestSessions.newAccount();
        assertThat(answer(noConsent, UUID.randomUUID(), thisWeek(), List.of())).hasStatus(403);

        AccountId noProfile = TestSessions.newAccount();
        send(noProfile, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", "1-draft"));
        assertThat(answer(noProfile, UUID.randomUUID(), thisWeek(), List.of())).as("no profile yet").hasStatus(409);

        // DECIDE_FOR_ME needs the phase gate, which needs the fat estimate (DURUM questions 11, 17).
        assertThat(answer(ready("DECIDE_FOR_ME"), UUID.randomUUID(), thisWeek(), List.of())).hasStatus(409);
    }

    @Test
    void anAnswerTheEngineCannotReadIsRefused() {
        AccountId account = ready("LOSE_FAT");

        assertThat(answer(account, UUID.randomUUID(), thisWeek(), List.of(Map.of("kind", "LOOK", "choice", "AMAZING")))).hasStatus(400);
    }

    @Test
    void theCycleAnswerDrivesTheCallButIsNotKept() throws Exception {
        AccountId account = ready("LOSE_FAT");

        answer(account, UUID.randomUUID(), thisWeek(), List.of(Map.of("kind", "CYCLE_STOPPED", "choice", "YES")));

        assertThat(jdbc.sql("select snapshot::text from decision.weekly_call where account_id = :a").param("a", account.value())
                .query(String.class).single()).doesNotContainIgnoringCase("menstrual").doesNotContainIgnoringCase("cycle");
    }

    @Test
    void theKeptSnapshotMakesTheSameCallAgain() throws Exception {
        // ADR-003 §6: a past call can be reproduced from what was kept.
        AccountId account = ready("LOSE_FAT");
        answer(account, UUID.randomUUID(), thisWeek(), List.of(Map.of("kind", "LOOK", "choice", "SAME")));
        Map<String, Object> kept = jdbc.sql("select snapshot::text as snapshot, decision::text as decision from decision.weekly_call where account_id = :a")
                .param("a", account.value()).query().singleRow();

        StoredSnapshot snapshot = JSON.readValue((String) kept.get("snapshot"), StoredSnapshot.class);
        Map<String, Object> again = DecisionJson.of(DecisionPipeline.decide(snapshot.toSnapshot(), parameters.forSex(snapshot.sex())));

        assertThat(JSON.readValue(JSON.writeValueAsString(again), Map.class)).isEqualTo(JSON.readValue((String) kept.get("decision"), Map.class));
    }

    @Test
    void theLedgerIsNewestFirstAndTheCurrentCallIsTheLatest() throws Exception {
        AccountId account = ready("LOSE_FAT");
        String latest = (String) map(answer(account, UUID.randomUUID(), thisWeek(), List.of())).get("id");
        // Two older calls, as earlier weeks would have left them.
        for (int weeks = 1; weeks <= 2; weeks++) {
            jdbc.sql("""
                    insert into decision.weekly_call (id, account_id, client_id, week_of, made_on, decided_at, parameters_hash, snapshot, decision, application)
                    select gen_random_uuid(), account_id, gen_random_uuid(), week_of - :days, made_on - :days, decided_at - make_interval(days => :days),
                           parameters_hash, snapshot, decision, application from decision.weekly_call where id = :id""")
                    .param("days", weeks * 7).param("id", UUID.fromString(latest)).update();
        }

        Map<String, Object> page = map(send(account, "GET", "/v1/decisions?limit=2", null));
        List<Map<String, Object>> items = (List<Map<String, Object>>) page.get("items");
        assertThat(items).hasSize(2).first().satisfies(call -> assertThat(call).containsEntry("id", latest));
        Map<String, Object> older = map(send(account, "GET", "/v1/decisions?limit=2&before=" + page.get("next"), null));
        assertThat((List<?>) older.get("items")).hasSize(1);
        assertThat(older).doesNotContainKey("next");
        assertThat(map(send(account, "GET", "/v1/decisions/current", null))).containsEntry("id", latest);
        assertThat(map(send(account, "GET", "/v1/decisions/" + latest, null))).containsEntry("id", latest);
        assertThat(send(ready("LOSE_FAT"), "GET", "/v1/decisions/" + latest, null)).as("someone else's").hasStatus(404);
    }

    private AccountId ready(String goal) {
        AccountId account = TestSessions.newAccount();
        send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", "1-draft"));
        send(account, "PUT", "/v1/profile", Map.of("goal", goal, "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")));
        send(account, "POST", "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt",
                java.time.Instant.now().minusSeconds(3600).toString(), "kg", 82.4, "source", "MANUAL"));
        return account;
    }

    private static LocalDate thisWeek() {
        return CheckInWeek.weekOf(LocalDate.now(ZoneOffset.UTC), DayOfWeek.MONDAY);
    }

    private MvcTestResult answer(AccountId account, UUID clientId, LocalDate weekOf, List<Map<String, Object>> answers) {
        return send(account, "POST", "/v1/check-ins/current/answers", Map.of("clientId", clientId, "weekOf", weekOf.toString(), "answers", answers));
    }

    private MvcTestResult send(AccountId account, String method, String uri, Object body) {
        var request = switch (method) {
            case "GET" -> mvc.get();
            case "PUT" -> mvc.put();
            default -> mvc.post();
        };
        request = request.uri(uri).header("Authorization", TestSessions.bearer(context, account));
        if (body != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(body));
        }
        return request.exchange();
    }

    private static Map<String, Object> map(MvcTestResult result) throws Exception {
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }
}
