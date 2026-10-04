package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
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

/**
 * The shape projection over the API (K-613, ADR-052): the engine's numbers on today's trend and the plan in force — health
 * data behind the consent, no fat number (U4), and a reason by name when it is not shown.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class ProjectionApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Test
    @SuppressWarnings("unchecked")
    void fiveWeeksIntoACutThreeScenariosSixMonthsAhead() throws Exception {
        AccountId account = weighedFor(onACut(), 35);

        MvcTestResult result = send(account, "GET", "/v1/projection");

        assertThat(result).hasStatusOk();
        String body = result.getResponse().getContentAsString();
        Map<String, Object> projection = JSON.readValue(body, Map.class);
        assertThat(projection).containsEntry("shown", true).containsEntry("direction", "LOSS")
                .containsEntry("on", LocalDate.now(ZoneOffset.UTC).plusWeeks(26).toString());
        List<Map<String, Object>> scenarios = (List<Map<String, Object>>) projection.get("scenarios");
        assertThat(scenarios).extracting(scenario -> ((Number) scenario.get("adherence")).doubleValue()).containsExactly(0.6, 0.8, 0.95);
        assertThat(scenarios).allSatisfy(scenario -> {
            assertThat(scenario).containsOnlyKeys("adherence", "lowKg", "kg", "highKg");
            assertThat(((Number) scenario.get("highKg")).doubleValue()).isLessThanOrEqualTo(((Number) projection.get("todayKg")).doubleValue());
        });
        // U4: the model's fat mass never leaves the engine.
        assertThat(body.toLowerCase(java.util.Locale.ROOT)).doesNotContain("fat");
    }

    @Test
    void beforeFourWeeksItSaysWhyByName() {
        assertThat(send(weighedFor(onACut(), 10), "GET", "/v1/projection")).hasStatusOk().bodyJson()
                .isLenientlyEqualTo("{\"shown\": false, \"reason\": \"TOO_EARLY\"}");
    }

    @Test
    void withoutAPlanThereIsNothingToProjectYet() {
        AccountId account = TestSessions.newAccount();
        consentAndProfile(account);

        assertThat(send(account, "GET", "/v1/projection")).hasStatusOk().bodyJson()
                .isLenientlyEqualTo("{\"shown\": false, \"reason\": \"TOO_EARLY\"}");
    }

    @Test
    void itIsHealthDataSoItNeedsTheConsent() {
        assertThat(send(TestSessions.newAccount(), "GET", "/v1/projection")).hasStatus(403).bodyJson()
                .extractingPath("$.code").isEqualTo("CONSENT_REQUIRED");
    }

    /** A man on UTC (30, 180 cm, activity not given) on a cut at 2600 kcal begun two months ago. */
    private AccountId onACut() {
        AccountId account = TestSessions.newAccount();
        consentAndProfile(account);
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        jdbc.sql("""
                insert into decision.plan (account_id, phase, phase_start, plan_start, target_kcal, observing_maintenance)
                values (:a, 'CUT', :began, :began, 2600, false)""").param("a", account.value()).param("began", today.minusDays(60)).update();
        return account;
    }

    private void consentAndProfile(AccountId account) {
        assertThat(send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA))).hasStatusOk();
        assertThat(send(account, "PUT", "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")))).hasStatusOk();
    }

    /** Weighed every morning for {@code days} days up to yesterday, about 82 kg and falling a little. */
    private AccountId weighedFor(AccountId account, int days) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        for (int day = days; day >= 1; day--) {
            assertThat(send(account, "POST", "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt",
                    today.minusDays(day).atTime(LocalTime.of(7, 0)).toInstant(ZoneOffset.UTC).toString(), "kg", 82.0 - (days - day) * 0.03,
                    "source", "MANUAL")).getResponse().getStatus()).isLessThan(300);
        }
        return account;
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
