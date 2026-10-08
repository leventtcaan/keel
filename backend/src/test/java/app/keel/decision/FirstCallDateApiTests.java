package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
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
 * The first call's day comes from the server (K-990, ADR-077 Ek 2; contract FirstWeeks.firstCallOn): the first check-in day
 * after the day onboarding finished — the profile's first save, not the first sign-in. Before it, no check-in is offered and
 * none is taken; on it, the check-in the phone named opens. The check-in day here is today's weekday, so finishing today
 * is the "finish on Monday" case: the call comes a week on, not today.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class FirstCallDateApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Test
    void finishingOnTheCheckInDayNamesTheNextOneAndOffersNoCheckInBeforeIt() throws Exception {
        LocalDate today = today();
        AccountId account = onboardedToday();

        assertThat(read(firstWeeks(account))).containsEntry("firstCallOn", today.plusWeeks(1).toString());
        assertThat(send(account, "GET", "/v1/check-ins/current", null)).hasStatus(404);
        assertThat(answer(account, today)).hasStatus(409);
    }

    @Test
    void theDaysBetweenSignInAndFinishingAreNotTheFirstWeek() throws Exception {
        // Signed in yesterday: counted from the sign-in, today's check-in would close the first week. Finished today, it does not.
        AccountId account = onboardedToday();
        jdbc.sql("update identity.account set created_at = now() - interval '1 day' where id = :id").param("id", account.value()).update();

        assertThat(send(account, "GET", "/v1/check-ins/current", null)).hasStatus(404);
        assertThat(read(firstWeeks(account))).containsEntry("firstCallOn", today().plusWeeks(1).toString()).containsEntry("week", 1);
    }

    @Test
    void onTheFirstCallsDayTheCheckInTheAppNamedOpensAndOnceMadeNoDayIsNamed() throws Exception {
        LocalDate today = today();
        AccountId account = onboardedToday();
        finished(account, 7);

        Map<String, Object> firstWeeks = read(firstWeeks(account));
        Map<String, Object> checkIn = read(send(account, "GET", "/v1/check-ins/current", null));

        assertThat(firstWeeks).containsEntry("firstCallOn", today.toString());
        assertThat(checkIn).containsEntry("weekOf", firstWeeks.get("firstCallOn")).containsEntry("answered", false);
        assertThat(answer(account, today)).hasStatusOk();
        assertThat(read(firstWeeks(account))).doesNotContainKey("firstCallOn");
    }

    @Test
    void aProfileSavedBeforeTheMomentWasKeptCountsFromTheFirstSignIn() throws Exception {
        // Onboarded before K-990: no finishing moment kept. Signed in yesterday: today, the check-in day, closes the first week.
        AccountId account = onboardedToday();
        jdbc.sql("update profile.profile set onboarded_at = null where account_id = :a").param("a", account.value()).update();
        jdbc.sql("update identity.account set created_at = now() - interval '1 day' where id = :id").param("id", account.value()).update();

        assertThat(read(send(account, "GET", "/v1/check-ins/current", null))).containsEntry("weekOf", today().toString());
        assertThat(read(firstWeeks(account))).containsEntry("firstCallOn", today().toString());
    }

    /** A man in UTC with the health data consent, checking in on today's weekday; his profile saved now. */
    private AccountId onboardedToday() {
        AccountId account = TestSessions.newAccount();
        assertThat(send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA))).hasStatusOk();
        assertThat(send(account, "PUT", "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", today().getDayOfWeek().name(), "timeZone", "UTC"))))
                .hasStatusOk();
        return account;
    }

    private void finished(AccountId account, int daysAgo) {
        jdbc.sql("update profile.profile set onboarded_at = now() - make_interval(days => :days) where account_id = :a").param("days", daysAgo)
                .param("a", account.value()).update();
    }

    private static LocalDate today() {
        return LocalDate.now(ZoneOffset.UTC);
    }

    private MvcTestResult firstWeeks(AccountId account) {
        return send(account, "GET", "/v1/first-weeks", null);
    }

    private MvcTestResult answer(AccountId account, LocalDate weekOf) {
        return send(account, "POST", "/v1/check-ins/current/answers", Map.of("clientId", UUID.randomUUID(), "weekOf", weekOf.toString(),
                "answers", List.of()));
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> read(MvcTestResult result) throws Exception {
        assertThat(result).hasStatusOk();
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
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
