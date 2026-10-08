package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.profile.TestOnboarding;
import app.keel.shared.AccountId;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
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
 * Imported history is seen, not decided on (ADR-018 §3, ADR-053): the first call still comes at the first check-in as a
 * "not yet" — a year of weigh-ins brought in from Apple Health and sessions from another app change no call, no
 * question and no tally. Without that, three imported weeks of fast loss made the safety net raise calories on day one:
 * a call on data the app never saw being measured (U8).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class FirstDecisionNotBeforeMondayTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final List<String> CALL = List.of("action", "reasons", "confidence", "nextReview", "copyKey", "application");

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Test
    void theFirstCallIsNotYetAndTheSameWithImportedHistory() throws Exception {
        AccountId own = ready();
        AccountId imported = ready();
        importWeighIns(imported);

        Map<String, Object> ownCall = map(answer(own));
        MvcTestResult importedResult = answer(imported);

        assertThat(importedResult).hasStatusOk();
        Map<String, Object> importedCall = map(importedResult);
        assertThat(importedCall.get("action")).isEqualTo(Map.of("type", "NO_DECISION_YET"));
        assertThat(pick(importedCall)).isEqualTo(pick(ownCall));
    }

    @Test
    void theCheckInAsksTheSameQuestions() throws Exception {
        AccountId own = ready();
        AccountId imported = ready();
        importWeighIns(imported);
        importSessionThisWeek(imported);

        assertThat(map(send(imported, "GET", "/v1/check-ins/current", null))).isEqualTo(map(send(own, "GET", "/v1/check-ins/current", null)));
    }

    @Test
    void anImportedSessionThisWeekIsNotCountedAsDone() throws Exception {
        AccountId own = ready();
        AccountId imported = ready();
        importWeighIns(imported);
        importSessionThisWeek(imported);
        assertThat(answer(own)).hasStatusOk();
        assertThat(answer(imported)).hasStatusOk();

        assertThat(map(send(imported, "GET", "/v1/consistency", null))).isEqualTo(map(send(own, "GET", "/v1/consistency", null)));
        assertThat(send(imported, "GET", "/v1/first-weeks", null).getResponse().getContentAsString())
                .isEqualTo(send(own, "GET", "/v1/first-weeks", null).getResponse().getContentAsString());
    }

    @Test
    void theImportedHistoryIsSeenInTheTrendAndTheList() throws Exception {
        AccountId own = ready();
        AccountId imported = ready();
        importWeighIns(imported);
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        String range = "?from=" + today.minusDays(21) + "&to=" + today;

        List<Map<String, Object>> ownTrend = list(send(own, "GET", "/v1/weight-trend" + range, null));
        List<Map<String, Object>> importedTrend = list(send(imported, "GET", "/v1/weight-trend" + range, null));

        assertThat(ownTrend).extracting(p -> p.get("day")).containsExactly(today.toString());
        assertThat(importedTrend).hasSizeGreaterThan(20).first().satisfies(p -> assertThat(p.get("day")).isEqualTo(today.minusDays(21).toString()));
        assertThat(list(send(imported, "GET", "/v1/weigh-ins" + range, null))).filteredOn(w -> "IMPORT".equals(w.get("source"))).hasSize(21);
    }

    /** Three weeks of daily weigh-ins before today, 87 kg down to 82.6 — 1.5 kg a week, over the weekly loss cap. */
    private void importWeighIns(AccountId account) {
        Instant now = Instant.now();
        for (int daysAgo = 21; daysAgo >= 1; daysAgo--) {
            double kg = Math.round((82.6 + (daysAgo - 1) * 1.5 / 7) * 100) / 100.0;
            assertThat(send(account, "POST", "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt",
                    now.minus(daysAgo, ChronoUnit.DAYS).toString(), "kg", kg, "source", "IMPORT")).getResponse().getStatus()).isLessThan(300);
        }
    }

    /** A session from another app's export, done this week. */
    private void importSessionThisWeek(AccountId account) {
        // Monday 00:00 in the account's zone (UTC): this week whatever the hour the test runs.
        Instant start = LocalDate.now(ZoneOffset.UTC).with(DayOfWeek.MONDAY).atStartOfDay(ZoneOffset.UTC).toInstant();
        assertThat(send(account, "POST", "/v1/workout-imports", Map.of("source", "STRONG", "workouts", List.of(Map.of(
                "clientId", UUID.randomUUID(), "startedAt", start.toString(), "endedAt", start.plus(1, ChronoUnit.HOURS).toString(),
                "sets", List.of(Map.of("exerciseId", "bench_press", "setType", "WORKING", "loadKg", 80, "reps", 8)))))))
                .hasStatusOk();
    }

    /**
     * A man starting a cut, today's own weigh-in an hour ago (as DecisionServiceTests), never before today's midnight (UTC): between 00:00 and 01:00
     * an hour ago is yesterday, and the trend would show a day the test doesn't expect.
     */
    private AccountId ready() {
        AccountId account = TestSessions.newAccount();
        send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA));
        send(account, "PUT", "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")));
        TestOnboarding.finishedTwoWeeksAgo(context, account);
        assertThat(send(account, "POST", "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt",
                todayAnHourAgo().toString(), "kg", 82.4, "source", "MANUAL")).getResponse().getStatus()).isLessThan(300);
        return account;
    }

    private static Instant todayAnHourAgo() {
        Instant now = Instant.now();
        Instant midnight = LocalDate.ofInstant(now, ZoneOffset.UTC).atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant hourAgo = now.minusSeconds(3600);
        return hourAgo.isBefore(midnight) ? midnight : hourAgo;
    }

    private static Map<String, Object> pick(Map<String, Object> call) {
        Map<String, Object> picked = new HashMap<>();
        CALL.forEach(key -> picked.put(key, call.get(key)));
        return picked;
    }

    private MvcTestResult answer(AccountId account) {
        LocalDate weekOf = CheckInWeek.weekOf(LocalDate.now(ZoneOffset.UTC), DayOfWeek.MONDAY);
        return send(account, "POST", "/v1/check-ins/current/answers", Map.of("clientId", UUID.randomUUID(), "weekOf", weekOf.toString(),
                "answers", List.of()));
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

    private static List<Map<String, Object>> list(MvcTestResult result) throws Exception {
        return JSON.readValue(result.getResponse().getContentAsString(), List.class);
    }
}
