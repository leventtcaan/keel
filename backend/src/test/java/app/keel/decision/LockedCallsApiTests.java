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

/**
 * Logging free, the call paid (ADR-091 Ek 1, K-1201): the first full call is free; the next one is kept but held back for an
 * account without the subscription: a locked view, no basis, no what-if, no apply, the plan as it was. Subscribing opens it.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class LockedCallsApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    /** What the calling phone says it can show: the newer phone by default, null for the 1.0 in the stores. */
    private String features = "locked-calls";

    @Test
    @SuppressWarnings("unchecked")
    void theFirstFullCallIsFreeAndTheSecondIsKeptButLocked() throws Exception {
        AccountId account = onACut();
        Map<String, Object> first = checkIn(account);
        assertThat(first).as("the free call, in full").containsKeys("action", "reasons").doesNotContainKey("locked");
        pushBackAWeek(first);
        String planBefore = send(account, "GET", "/v1/targets").getResponse().getContentAsString();

        Map<String, Object> second = checkIn(account);

        assertThat(second).containsOnlyKeys("id", "madeOn", "weekOf", "nextCallOn", "locked").containsEntry("locked", true);
        assertThat(JSON.readValue(send(account, "GET", "/v1/decisions/current").getResponse().getContentAsString(), Map.class)).isEqualTo(second);
        assertThat(JSON.readValue(send(account, "GET", "/v1/decisions/" + second.get("id")).getResponse().getContentAsString(), Map.class)).isEqualTo(second);
        List<Map<String, Object>> ledger = (List<Map<String, Object>>) JSON.readValue(send(account, "GET", "/v1/decisions").getResponse()
                .getContentAsString(), Map.class).get("items");
        assertThat(ledger).hasSize(2);
        assertThat(ledger.get(0)).isEqualTo(second);
        assertThat(ledger.get(1)).as("the free call stays whole").containsKey("action");
        for (String path : List.of("/basis", "/what-if")) {
            assertThat(send(account, "GET", "/v1/decisions/" + second.get("id") + path)).as(path).hasStatus(403).bodyJson()
                    .extractingPath("$.code").isEqualTo("ENTITLEMENT_REQUIRED");
        }
        for (String path : List.of("/apply", "/decline", "/undo")) {
            assertThat(send(account, "POST", "/v1/decisions/" + second.get("id") + path)).as(path).hasStatus(403).bodyJson()
                    .extractingPath("$.code").isEqualTo("ENTITLEMENT_REQUIRED");
        }
        // Kept, so subscribing shows it; not applied, so the plan is as it was.
        assertThat(jdbc.sql("select held_back from decision.weekly_call where id = :id").param("id", UUID.fromString((String) second.get("id")))
                .query(Boolean.class).single()).isTrue();
        assertThat(jdbc.sql("select application from decision.weekly_call where id = :id").param("id", UUID.fromString((String) second.get("id")))
                .query(String.class).single()).isNotEqualTo("APPLIED");
        assertThat(send(account, "GET", "/v1/targets").getResponse().getContentAsString()).isEqualTo(planBefore);
    }

    @Test
    void wipingTheHealthDataDoesNotRenewTheFreeCall() throws Exception {
        AccountId account = onACut();
        checkIn(account);
        assertThat(context.getBean(app.keel.subscription.FreeCallUse.class).used(account)).isEqualTo(1);

        assertThat(send(account, "DELETE", "/v1/consents/HEALTH_DATA?confirmDataDeletion=true")).hasStatusOk();

        assertThat(jdbc.sql("select count(*) from decision.weekly_call where account_id = :a").param("a", account.value()).query(Long.class).single())
                .as("the calls are gone").isZero();
        assertThat(context.getBean(app.keel.subscription.FreeCallUse.class).used(account)).as("the spent call stays spent").isEqualTo(1);
    }

    @Test
    @SuppressWarnings("unchecked")
    void subscribingOpensTheLockedCallOfThisWeek() throws Exception {
        AccountId account = onACut();
        pushBackAWeek(checkIn(account));
        Map<String, Object> locked = checkIn(account);
        assertThat(locked).containsEntry("locked", true);

        jdbc.sql("insert into subscription.subscription (account_id, status, access_until, last_event_at) values (:a, 'ACTIVE', now() + interval '30 days', now())")
                .param("a", account.value()).update();

        Map<String, Object> opened = JSON.readValue(send(account, "GET", "/v1/decisions/current").getResponse().getContentAsString(), Map.class);
        assertThat(opened).containsEntry("id", locked.get("id")).containsKeys("action", "reasons", "changes").doesNotContainKey("locked");
        // As any call made with the subscription: applied by default when it moves the plan, never left held.
        assertThat((Map<String, Object>) opened.get("application")).extractingByKey("state").isNotEqualTo("PENDING");
        assertThat(send(account, "GET", "/v1/decisions/" + locked.get("id") + "/basis")).hasStatusOk();
        assertThat(jdbc.sql("select count(*) from decision.weekly_call where account_id = :a and held_back").param("a", account.value())
                .query(Long.class).single()).isZero();
    }

    @Test
    void aLockedCallOfAPastWeekIsShownButNotAppliedWhenTheAccountSubscribes() throws Exception {
        AccountId account = onACut();
        pushBack(checkIn(account), 2);
        Map<String, Object> older = checkIn(account);
        pushBack(older, 1);
        jdbc.sql("insert into subscription.subscription (account_id, status, access_until, last_event_at) values (:a, 'ACTIVE', now() + interval '30 days', now())")
                .param("a", account.value()).update();

        // Visible as history, never applied afterwards: only the latest call is ever applied, and its week is over.
        assertThat(send(account, "GET", "/v1/decisions/" + older.get("id"))).hasStatusOk().bodyJson().extractingPath("$.action").isNotNull();
        assertThat(jdbc.sql("select application from decision.weekly_call where id = :id").param("id", UUID.fromString((String) older.get("id")))
                .query(String.class).single()).isNotEqualTo("APPLIED");
    }

    @Test
    @SuppressWarnings("unchecked")
    void thePhoneOfBeforeIsServedAsBeforeAndItsFullCallsStillCount() throws Exception {
        AccountId account = onACut();
        features = null;
        Map<String, Object> first = checkIn(account);
        pushBackAWeek(first);

        Map<String, Object> second = checkIn(account);

        // As on main: no hold, a whole view, applied by default when it moves the plan.
        assertThat(second).containsKeys("action", "reasons", "changes").doesNotContainKey("locked");
        assertThat(jdbc.sql("select held_back from decision.weekly_call where account_id = :a").param("a", account.value()).query(Boolean.class).list())
                .containsOnly(false);
        assertThat(context.getBean(app.keel.subscription.FreeCallUse.class).used(account)).as("both counted, as on any device").isEqualTo(2);
        assertThat(send(account, "GET", "/v1/decisions/" + second.get("id") + "/basis")).hasStatusOk();
        assertThat(send(account, "GET", "/v1/decisions/" + second.get("id") + "/what-if")).hasStatusOk();
    }

    @Test
    void aCallHeldBackForANewPhoneIsReadInFullByTheOldOne() throws Exception {
        // The accepted edge (ADR-091 Ek 1): the old phone has no lock to show, and it is served as it always was.
        AccountId account = onACut();
        pushBackAWeek(checkIn(account));
        Map<String, Object> locked = checkIn(account);
        assertThat(locked).containsEntry("locked", true);

        features = null;

        assertThat(send(account, "GET", "/v1/decisions/current")).hasStatusOk().bodyJson().extractingPath("$.action").isNotNull();
        assertThat(send(account, "GET", "/v1/decisions/" + locked.get("id") + "/basis")).hasStatusOk();
    }

    /** Makes the call last week's: the account's next check-in is this week's. */
    private void pushBackAWeek(Map<String, Object> call) {
        pushBack(call, 1);
    }

    private void pushBack(Map<String, Object> call, int weeks) {
        jdbc.sql("update decision.weekly_call set week_of = week_of - :days, made_on = made_on - :days, decided_at = decided_at - :days * interval '1 day' where id = :id")
                .param("id", UUID.fromString((String) call.get("id"))).param("days", weeks * 7).update();
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
            case "DELETE" -> mvc.delete();
            default -> mvc.post();
        };
        request = request.uri(uri).header("Authorization", TestSessions.bearer(context, account));
        if (features != null) {
            request = request.header("X-Keel-Features", features);
        }
        if (body != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(body));
        }
        return request.exchange();
    }
}
