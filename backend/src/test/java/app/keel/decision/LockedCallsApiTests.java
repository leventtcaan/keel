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
import java.util.Optional;
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
        Map<String, Object> first = fullCheckIn(account);
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
        fullCheckIn(account);
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
        pushBackAWeek(fullCheckIn(account));
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
        pushBack(fullCheckIn(account), 2);
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
        Map<String, Object> first = fullCheckIn(account);
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
    @SuppressWarnings("unchecked")
    void leavingTheHeaderOffOnAMarkedAccountStillLocksAndTheOldPhoneGetsTheErrorItHandles() throws Exception {
        // ADR-091 Ek 1, threat model: the header is the client's word. The account said once that its phone shows locked calls.
        AccountId account = onACut();
        pushBackAWeek(fullCheckIn(account));
        Map<String, Object> locked = checkIn(account);
        assertThat(locked).containsEntry("locked", true);

        features = null;

        for (String path : List.of("/v1/decisions/current", "/v1/decisions/" + locked.get("id"), "/v1/decisions/" + locked.get("id") + "/basis",
                "/v1/decisions/" + locked.get("id") + "/what-if")) {
            assertThat(send(account, "GET", path)).as(path).hasStatus(403).bodyJson().extractingPath("$.code").isEqualTo("ENTITLEMENT_REQUIRED");
        }
        for (String path : List.of("/apply", "/undo", "/decline")) {
            assertThat(send(account, "POST", "/v1/decisions/" + locked.get("id") + path)).as(path).hasStatus(403);
        }
        // No reduced view for a phone that would crash on it: the ledger holds the calls it can read.
        assertThat((List<Map<String, Object>>) JSON.readValue(send(account, "GET", "/v1/decisions").getResponse().getContentAsString(), Map.class)
                .get("items")).hasSize(1).allSatisfy(call -> assertThat(call).containsKey("action"));
    }

    @Test
    void aCheckInWithoutTheHeaderOnAMarkedAccountIsHeldBackAsWell() throws Exception {
        AccountId account = onACut();
        pushBackAWeek(fullCheckIn(account)); // marks the account
        features = null;

        assertThat(send(account, "POST", "/v1/check-ins/current/answers", Map.of("clientId", UUID.randomUUID(), "weekOf",
                CheckInWeek.weekOf(LocalDate.now(ZoneOffset.UTC), DayOfWeek.MONDAY).toString(),
                "answers", List.of(Map.of("kind", "TRAINING", "choice", "STABLE"))))).hasStatus(403);
        assertThat(jdbc.sql("select count(*) from decision.weekly_call where account_id = :a and held_back").param("a", account.value())
                .query(Long.class).single()).as("kept, held back").isEqualTo(1);
    }

    @Test
    @SuppressWarnings("unchecked")
    void aSafetyCallPastTheAllowanceIsNeverHeldBackAndSpendsNothing() throws Exception {
        // Losing far too fast: the safety net speaks (U6). The account's free call is already spent and it has no subscription.
        AccountId account = onACut(0.3);
        uses().record(account);

        Map<String, Object> call = checkIn(account);

        assertThat(call).as("a whole view").containsKey("action").doesNotContainKey("locked");
        assertThat(((List<Map<String, Object>>) call.get("reasons")).stream().map(reason -> reason.get("rule")))
                .as("the scenario is a safety call").anyMatch(rule -> app.keel.engine.SafetyNet.RULES.stream().anyMatch(known -> known.value().equals(rule)));
        assertThat(jdbc.sql("select held_back from decision.weekly_call where account_id = :a").param("a", account.value()).query(Boolean.class).single())
                .isFalse();
        assertThat((Map<String, Object>) call.get("application")).containsEntry("state", "APPLIED");
        assertThat(uses().used(account)).as("counter unchanged").isEqualTo(1);
    }

    @Test
    void aReplayedCheckInDoesNotSpendTheFreeCallTwice() throws Exception {
        AccountId account = onACut();
        Map<String, Object> body = Map.of("clientId", UUID.randomUUID(), "weekOf", CheckInWeek.weekOf(LocalDate.now(ZoneOffset.UTC), DayOfWeek.MONDAY).toString(),
                "answers", List.of(Map.of("kind", "TRAINING", "choice", "STABLE")));

        assertThat(send(account, "POST", "/v1/check-ins/current/answers", body)).hasStatusOk();
        assertThat(send(account, "POST", "/v1/check-ins/current/answers", body)).hasStatusOk();

        assertThat(uses().used(account)).isEqualTo(1);
    }

    @Test
    @SuppressWarnings("unchecked")
    void subscribingAppliesTheHeldCallOfThisWeekThroughTheOneApplyPath() throws Exception {
        AccountId account = onACut();
        pushBackAWeek(fullCheckIn(account));
        Map<String, Object> locked = checkIn(account);
        // A call that moves the plan, held (the engine's own call this week changes nothing): setup only.
        jdbc.sql("""
                update decision.weekly_call set application = 'PENDING',
                decision = jsonb_set(decision, '{action}', '{"type":"INCREASE_CALORIES","kcalPerDay":100}')
                where id = :id""").param("id", UUID.fromString((String) locked.get("id"))).update();
        String before = send(account, "GET", "/v1/targets").getResponse().getContentAsString();
        assertThat(send(account, "GET", "/v1/decisions/current")).hasStatusOk().bodyJson().extractingPath("$.locked").isEqualTo(true);

        subscribe(account, "now() + interval '30 days'");

        assertThat(send(account, "GET", "/v1/decisions/current")).hasStatusOk().bodyJson().extractingPath("$.application.state").isEqualTo("APPLIED");
        assertThat(jdbc.sql("select plan_after is not null from decision.weekly_call where id = :id").param("id", UUID.fromString((String) locked.get("id")))
                .query(Boolean.class).single()).isTrue();
        assertThat(send(account, "GET", "/v1/targets").getResponse().getContentAsString()).as("the plan moved").isNotEqualTo(before);
    }

    @Test
    void theCoachDoesNotSeeAHeldCallUntilTheAccountSubscribes() throws Exception {
        AccountId account = onACut();
        pushBackAWeek(fullCheckIn(account));
        checkIn(account);
        CallReader reader = context.getBean(CallReader.class);

        assertThat(reader.call(account, Optional.empty())).as("held: not found").isEmpty();

        subscribe(account, "now() + interval '30 days'");
        assertThat(reader.call(account, Optional.empty())).isPresent();
    }

    @Test
    void aLapsedSubscriptionLocksAgainAndARenewedOneReleases() throws Exception {
        AccountId account = onACut();
        pushBackAWeek(fullCheckIn(account));
        checkIn(account);

        subscribe(account, "now() - interval '1 day'");
        assertThat(send(account, "GET", "/v1/decisions/current")).as("access_until in the past").hasStatusOk().bodyJson().extractingPath("$.locked").isEqualTo(true);

        jdbc.sql("update subscription.subscription set access_until = now() + interval '30 days' where account_id = :a").param("a", account.value()).update();
        assertThat(send(account, "GET", "/v1/decisions/current")).as("renewed").hasStatusOk().bodyJson().extractingPath("$.action").isNotNull();
    }

    private app.keel.subscription.FreeCallUse uses() {
        return context.getBean(app.keel.subscription.FreeCallUse.class);
    }

    private void subscribe(AccountId account, String accessUntil) {
        jdbc.sql("insert into subscription.subscription (account_id, status, access_until, last_event_at) values (:a, 'ACTIVE', " + accessUntil + ", now())")
                .param("a", account.value()).update();
    }

    /**
     * This week's check-in, checked to be a call that read the decision window (a full call): the fixture's plan has run for 60 days
     * with 28 daily weigh-ins, so the weekly spine runs. Anything else (data_insufficient, window_not_full) is a broken fixture, and the
     * lock cannot be tested on it.
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> fullCheckIn(AccountId account) throws Exception {
        Map<String, Object> call = checkIn(account);
        assertThat(call).as("a whole view: the first full call is free").containsKey("reasons");
        assertThat(((List<Map<String, Object>>) call.get("reasons")).stream().map(reason -> reason.get("rule")))
                .as("the decision window was read").doesNotContain("window_not_full", "data_insufficient");
        return call;
    }

    /**
     * A call that moves the plan restarts its wait (the plan's start is today): the next week's call would then read no full window.
     * The plan is put back as the fixture made it, as if last week's call had changed nothing, so every week of a test is a full one.
     */
    private void restorePlan(AccountId account) {
        jdbc.sql("""
                update decision.plan set phase = 'CUT', phase_start = :began, plan_start = :began, target_kcal = 2600, observing_maintenance = false,
                steps_per_day = null, mini_cut_until = null where account_id = :a""")
                .param("a", account.value()).param("began", LocalDate.now(ZoneOffset.UTC).minusDays(60)).update();
    }

    /** Makes the call last week's: the account's next check-in is this week's. */
    private void pushBackAWeek(Map<String, Object> call) {
        pushBack(call, 1);
    }

    private void pushBack(Map<String, Object> call, int weeks) {
        UUID account = jdbc.sql("select account_id from decision.weekly_call where id = :id").param("id", UUID.fromString((String) call.get("id")))
                .query(UUID.class).single();
        restorePlan(new AccountId(account));
        jdbc.sql("update decision.weekly_call set week_of = week_of - :days, made_on = made_on - :days, decided_at = decided_at - :days * interval '1 day' where id = :id")
                .param("id", UUID.fromString((String) call.get("id"))).param("days", weeks * 7).update();
    }

    /** A man on UTC on a cut begun two months ago, weighed every morning for the last four weeks. */
    private AccountId onACut() {
        return onACut(0.05);
    }

    private AccountId onACut(double lossPerDayKg) {
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
                    today.minusDays(day).atTime(LocalTime.of(7, 0)).toInstant(ZoneOffset.UTC).toString(), "kg", 82.0 - day * lossPerDayKg,
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
