package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.profile.TestOnboarding;
import app.keel.shared.AccountId;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
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

/** The basis of a call over the API (K-519): from the call's own stored snapshot, behind the consent, the user's own only. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class DecisionBasisApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Test
    @SuppressWarnings("unchecked")
    void theRowsOfACallAreItsOwnWindowAndAnswers() throws Exception {
        AccountId account = onACut();
        Map<String, Object> call = checkIn(account);

        MvcTestResult result = send(account, "GET", "/v1/decisions/" + call.get("id") + "/basis");

        assertThat(result).hasStatusOk();
        String body = result.getResponse().getContentAsString();
        Map<String, Object> basis = JSON.readValue(body, Map.class);
        assertThat(basis).containsEntry("phase", "CUT");
        assertThat((List<Map<String, Object>>) basis.get("weeks")).isNotEmpty().allSatisfy(week -> assertThat(week).containsKeys("ends", "kg"));
        assertThat((Map<String, Object>) basis.get("answers")).containsEntry("training", "STABLE");
        // K-526 (ADR-041 #63): a new call keeps the counts its adherence is made of — the weigh-ins planned and done here.
        Map<String, Object> count = (Map<String, Object>) basis.get("adherenceCount");
        assertThat(count).containsOnlyKeys("done", "planned");
        assertThat(new java.math.BigDecimal(String.valueOf(basis.get("adherence")))).isEqualByComparingTo(
                java.math.BigDecimal.valueOf((Integer) count.get("done")).divide(java.math.BigDecimal.valueOf((Integer) count.get("planned")),
                        java.math.MathContext.DECIMAL64));
        // Never a fat estimate (U4), never the cycle answer (not kept).
        assertThat(body.toLowerCase()).doesNotContain("fat").doesNotContain("cycle").doesNotContain("menstrual");
        // K-611: the ledger keeps the latest week the call read — the basis's last weekly mean, the same number.
        List<Map<String, Object>> weeks = (List<Map<String, Object>>) basis.get("weeks");
        Map<String, Object> ledger = JSON.readValue(send(account, "GET", "/v1/decisions").getResponse().getContentAsString(), Map.class);
        assertThat(((List<Map<String, Object>>) ledger.get("items")).getFirst()).containsEntry("id", call.get("id"))
                .hasEntrySatisfying("readTrendKg", kg -> assertThat(new java.math.BigDecimal(String.valueOf(kg)))
                        .isEqualByComparingTo(new java.math.BigDecimal(String.valueOf(weeks.getLast().get("kg")))));
    }

    @Test
    @SuppressWarnings("unchecked")
    void aCallKeptBeforeTheCountsShowsItsShareAndNoCount() throws Exception {
        // K-526 (ADR-041 #63): no count is made up for an older call — through the real jsonb and the server's own JSON.
        AccountId account = onACut();
        Map<String, Object> call = checkIn(account);
        jdbc.sql("update decision.weekly_call set snapshot = snapshot #- '{checkIn,adherenceDone}' #- '{checkIn,adherencePlanned}' where id = :id")
                .param("id", UUID.fromString((String) call.get("id"))).update();

        Map<String, Object> basis = JSON.readValue(send(account, "GET", "/v1/decisions/" + call.get("id") + "/basis").getResponse()
                .getContentAsString(), Map.class);

        assertThat(basis).containsKey("adherence").doesNotContainKey("adherenceCount");
    }

    @Test
    void anotherUsersCallOrNoneIsNotFound() throws Exception {
        AccountId owner = onACut();
        Map<String, Object> call = checkIn(owner);
        AccountId other = onACut();

        assertThat(send(other, "GET", "/v1/decisions/" + call.get("id") + "/basis")).hasStatus(404);
        assertThat(send(owner, "GET", "/v1/decisions/" + UUID.randomUUID() + "/basis")).hasStatus(404);
    }

    @Test
    @SuppressWarnings("unchecked")
    void whatWouldChangeTheCallIsTheSameRulesOnExampleDataLabelledSo() throws Exception {
        // K-610 (L3 Y3, prototype 5.6): every combination of next week, each the engine's call — the kind of source only
        // (K-523), and marked as example data so it is never read as the user's own.
        AccountId account = onACut();
        Map<String, Object> call = checkIn(account);

        MvcTestResult result = send(account, "GET", "/v1/decisions/" + call.get("id") + "/what-if");

        assertThat(result).hasStatusOk();
        String body = result.getResponse().getContentAsString();
        Map<String, Object> whatIf = JSON.readValue(body, Map.class);
        assertThat(whatIf).containsEntry("example", true);
        List<Map<String, Object>> scenarios = (List<Map<String, Object>>) whatIf.get("scenarios");
        assertThat(scenarios).hasSize(8).allSatisfy(scenario -> {
            assertThat((Map<String, Object>) scenario.get("when")).containsOnlyKeys("trend", "adherence", "training");
            assertThat((Map<String, Object>) scenario.get("decision")).containsKeys("action", "reasons", "copyKey", "confidence", "nextReview");
        });
        assertThat(body).doesNotContain("arastirma/").doesNotContain("reference");
        // The call itself is untouched: its basis reads as before.
        assertThat(send(account, "GET", "/v1/decisions/" + call.get("id") + "/basis")).hasStatusOk();
        assertThat(send(onACut(), "GET", "/v1/decisions/" + call.get("id") + "/what-if")).as("someone else's").hasStatus(404);
    }

    @Test
    @SuppressWarnings("unchecked")
    void theExamplesAreFromThePlanInForceNowAndOnlyForTheLatestCall() throws Exception {
        // K-610 review: a call applied changes the plan (a new target from today); an example built from the call's own
        // snapshot would step calories again from the old target. From the plan in force now, a flat week has no full window.
        AccountId account = onACut();
        Map<String, Object> call = checkIn(account);
        jdbc.sql("update decision.plan set plan_start = :today, target_kcal = 2100 where account_id = :a").param("a", account.value())
                .param("today", LocalDate.now(ZoneOffset.UTC)).update();

        Map<String, Object> whatIf = JSON.readValue(send(account, "GET", "/v1/decisions/" + call.get("id") + "/what-if").getResponse()
                .getContentAsString(), Map.class);

        Map<String, Object> flat = ((List<Map<String, Object>>) whatIf.get("scenarios")).stream()
                .filter(scenario -> scenario.get("when").equals(Map.of("trend", "FLAT", "adherence", "ON_TRACK", "training", "HOLDING")))
                .findFirst().orElseThrow();
        assertThat((Map<String, Object>) ((Map<String, Object>) flat.get("decision")).get("action")).containsEntry("type", "NO_DECISION_YET");

        // An older call has no examples: what would change things is the latest call's question. A call is applied as it is made
        // (K-1000, ADR-077 #3), so the copy that stands for the older one carries the applied columns too (setup only).
        UUID older = UUID.randomUUID();
        jdbc.sql("""
                insert into decision.weekly_call (id, account_id, client_id, week_of, made_on, decided_at, parameters_hash, snapshot, decision, application,
                                                  applied_at, plan_before, plan_after)
                select :older, account_id, gen_random_uuid(), week_of - 7, made_on - 7, decided_at - interval '7 days', parameters_hash, snapshot,
                       decision, application, applied_at - interval '7 days', plan_before, plan_after
                from decision.weekly_call where id = :id""")
                .param("older", older).param("id", UUID.fromString((String) call.get("id"))).update();
        assertThat(send(account, "GET", "/v1/decisions/" + older + "/what-if")).hasStatus(404);
    }

    @Test
    void itIsHealthDataSoItNeedsTheConsent() {
        AccountId account = TestSessions.newAccount();
        assertThat(send(account, "GET", "/v1/decisions/" + UUID.randomUUID() + "/basis")).hasStatus(403).bodyJson()
                .extractingPath("$.code").isEqualTo("CONSENT_REQUIRED");
    }

    /** A man on UTC on a cut begun two months ago, weighed every morning for the last four weeks. */
    private AccountId onACut() {
        AccountId account = TestSessions.newAccount();
        assertThat(send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA))).hasStatusOk();
        assertThat(send(account, "PUT", "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")))).hasStatusOk();
        TestOnboarding.finishedTwoWeeksAgo(context, account);
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        jdbc.sql("""
                insert into decision.plan (account_id, phase, phase_start, plan_start, target_kcal, observing_maintenance)
                values (:a, 'CUT', :began, :began, 2600, false)""").param("a", account.value()).param("began", today.minusDays(60)).update();
        for (int day = 28; day >= 1; day--) {
            assertThat(send(account, "POST", "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt",
                    today.minusDays(day).atTime(LocalTime.of(7, 0)).toInstant(ZoneOffset.UTC).toString(), "kg", 82.0 - day * 0.05,
                    "source", "MANUAL")).getResponse().getStatus()).isLessThan(300);
        }
        return account;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> checkIn(AccountId account) throws Exception {
        MvcTestResult result = send(account, "POST", "/v1/check-ins/current/answers", Map.of("clientId", UUID.randomUUID(),
                "weekOf", CheckInWeek.weekOf(LocalDate.now(ZoneOffset.UTC), DayOfWeek.MONDAY).toString(),
                "answers", List.of(Map.of("kind", "TRAINING", "choice", "STABLE"))));
        assertThat(result).hasStatusOk();
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }

    private MvcTestResult send(AccountId account, String method, String uri) {
        return send(account, method, uri, null);
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
}
