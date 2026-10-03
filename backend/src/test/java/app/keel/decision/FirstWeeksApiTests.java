package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
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
 * The first eight weeks over the API (K-513, ADR-040): the user's own week from the day the account began, its words,
 * and — once the user's week just over is week five to eight — that week's signals, read from the modules' logs: no
 * session, consistency's forgiven week, logging dropped. A week paused by a declared state or the ladder's week off
 * signals nothing. Health data: behind the consent.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class FirstWeeksApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Test
    void aNewAccountIsInItsFirstWeekWithNothingToSay() throws Exception {
        AccountId account = ready(List.of("MONDAY"));

        Map<String, Object> week = read(get(account));

        assertThat(week).containsEntry("week", 1).containsEntry("risk", List.of()).doesNotContainKey("contentKey")
                .containsEntry("readsRisk", false);
    }

    @Test
    void aWeekThatReadsTheRiskSaysSoEvenQuiet() throws Exception {
        // K-521: the phone adds the app not opened in the same weeks, so the server says which weeks those are.
        assertThat(read(get(inWeekSix()))).containsEntry("week", 6).containsEntry("readsRisk", true);
    }

    @Test
    void eachWeekHasItsWordsAndSomeoneNotTrainingReadsTheirOwn() throws Exception {
        AccountId training = ready(List.of("MONDAY"));
        began(training, today().minusDays(15));
        AccountId notTraining = ready(List.of());
        began(notTraining, today().minusDays(15));

        assertThat(read(get(training))).containsEntry("week", 3).containsEntry("contentKey", "first_weeks.week3");
        assertThat(read(get(notTraining))).containsEntry("week", 3).containsEntry("contentKey", "first_weeks.no_training.week3");
    }

    @Test
    void theProgramsDaysDecideWhetherTrainingIsPlanned() throws Exception {
        // K-530 (ADR-043 #74): a program asks for training even when the profile names no day (without one, the profile:
        // eachWeekHasItsWordsAndSomeoneNotTrainingReadsTheirOwn).
        AccountId programmed = ready(List.of());
        program(programmed, "TUESDAY", null);
        began(programmed, today().minusDays(15));

        assertThat(read(get(programmed))).containsEntry("week", 3).containsEntry("contentKey", "first_weeks.week3");
    }

    @Test
    void inTheSixthWeekAProgramsSessionsAreAskedForWhenTheProfileNamesNoDay() throws Exception {
        // The risk reads the same number: no session in the week just over is a risk once the program asks for one.
        AccountId account = ready(List.of());
        program(account, "MONDAY");
        // Made when the account began: the week just over was asked for by it (a week before a program is K-530's question 2).
        jdbc.sql("with made as (update training.program set created_at = now() - interval '35 days' where account_id = :a returning created_at) "
                + "update training.program_history set effective_from = (select created_at from made) where account_id = :a").param("a", account.value()).update();
        began(account, today().minusDays(35));

        assertThat(rules(account)).containsExactly("no_session_last_week");
    }

    @Test
    void aProgramMadeThisWeekAskedNothingOfTheWeekJustOver() throws Exception {
        // K-535 (ADR-049): the profile names no day; the program came three days ago. The week just over asked no session:
        // none done is no risk (U7). This week's words are the program's (theProgramsDaysDecideWhetherTrainingIsPlanned).
        AccountId account = ready(List.of());
        program(account, "MONDAY");
        jdbc.sql("with made as (update training.program set created_at = now() - interval '3 days' where account_id = :a returning created_at) "
                + "update training.program_history set effective_from = (select created_at from made) where account_id = :a").param("a", account.value()).update();
        began(account, today().minusDays(35));

        assertThat(rules(account)).isEmpty();
        assertThat(read(get(account))).containsEntry("contentKey", "first_weeks.week6");
    }

    @Test
    @SuppressWarnings("unchecked")
    void inTheSixthWeekNoSessionInTheUsersWeekJustOverIsARiskWithItsSource() throws Exception {
        AccountId account = inWeekSix();
        // A session today is this week's, not the week just over's.
        session(account, today());

        List<Map<String, Object>> risk = (List<Map<String, Object>>) read(get(account)).get("risk");

        assertThat(risk).singleElement().satisfies(signal -> {
            assertThat(signal).containsEntry("rule", "no_session_last_week");
            // The kind of source only (K-523, ADR-041 #72): the research path stays on the server.
            assertThat((Map<String, Object>) signal.get("source")).isEqualTo(Map.of("tag", "LITERATURE"));
        });
    }

    @Test
    void aSessionInTheUsersWeekJustOverIsNoRisk() throws Exception {
        AccountId account = inWeekSix();
        session(account, today().minusDays(3));

        assertThat(read(get(account))).containsEntry("week", 6).containsEntry("risk", List.of());
    }

    @Test
    void beforeTheUsersWeekJustOverIsTheFifthNoRiskIsRead() throws Exception {
        AccountId account = ready(List.of("MONDAY"));
        began(account, today().minusDays(34));

        assertThat(read(get(account))).containsEntry("week", 5).containsEntry("risk", List.of());
    }

    @Test
    void loggingDroppedUnderAWeeksWorthIsARisk() throws Exception {
        AccountId account = inWeekSix();
        session(account, today().minusDays(3));
        // Food on four days of the week before (min_logged_days_per_week), on one day of the week just over — its edges:
        // the week before's last day and the week just over's first.
        for (int day : new int[] {14, 13, 12, 8}) {
            meal(account, today().minusDays(day));
        }
        meal(account, today().minusDays(7));

        assertThat(rules(account)).containsExactly("logging_dropped");
    }

    @Test
    void consistencysForgivenWeekInsideTheUsersWeekJustOverIsARisk() throws Exception {
        AccountId account = inWeekSix();
        // Yesterday's session keeps "no session" quiet; on a Monday it falls in the missed calendar week, still a miss (1 of 5).
        session(account, today().minusDays(1));
        // The calendar week ending on the Sunday inside the user's week just over: nothing done, a lone miss after a week
        // on track (a session and three of four weigh-ins, 4 of 5) — the one week consistency forgives.
        LocalDate missed = today().minusDays(1).with(TemporalAdjusters.previousOrSame(DayOfWeek.SUNDAY)).minusDays(6);
        LocalDate kept = missed.minusWeeks(1);
        jdbc.sql("""
                insert into decision.plan (account_id, phase, phase_start, plan_start, target_kcal, observing_maintenance)
                values (:a, 'CUT', :began, :began, 2600, false)""").param("a", account.value()).param("began", kept).update();
        session(account, kept);
        for (int day = 1; day <= 3; day++) {
            weighIn(account, kept.plusDays(day));
        }

        assertThat(rules(account)).containsExactly("forgiven_week_used");
    }

    @Test
    void aWeekPausedByADeclaredStateOrTheLaddersWeekOffSignalsNothing() throws Exception {
        AccountId declared = inWeekSix();
        jdbc.sql("""
                insert into decision.declared_state (id, account_id, kind, starts_on, ends_on, created_at)
                values (:id, :a, 'SICK', :from, :to, now())""").param("id", UUID.randomUUID()).param("a", declared.value())
                .param("from", today().minusDays(6)).param("to", today().minusDays(4)).update();
        AccountId resting = inWeekSix();
        jdbc.sql("""
                insert into training.program_change (id, account_id, call_id, kind, starts_on, ends_on)
                values (:id, :a, :call, 'REST_WEEK', :from, :to)""").param("id", UUID.randomUUID()).param("a", resting.value())
                .param("call", UUID.randomUUID()).param("from", today().minusDays(7)).param("to", today().minusDays(1)).update();

        assertThat(rules(declared)).isEmpty();
        assertThat(rules(resting)).isEmpty();
    }

    @Test
    void theNinthWeekReadsTheEighthsRiskWithoutWordsAndThenTheFlowIsOver() throws Exception {
        AccountId account = ready(List.of("MONDAY"));
        began(account, today().minusDays(56));

        Map<String, Object> ninth = read(get(account));
        assertThat(ninth).containsEntry("week", 9).doesNotContainKey("contentKey");
        assertThat(rules(account)).containsExactly("no_session_last_week");

        began(account, today().minusDays(63));
        assertThat(get(account)).hasStatus(404).bodyJson().extractingPath("$.code").isEqualTo("NOT_FOUND");
    }

    @Test
    void theWeekIsOnTheUsersCalendarNotUtcs() throws Exception {
        // Istanbul is UTC+3: begun at half past midnight there, the account began the evening before on UTC.
        ZoneId istanbul = ZoneId.of("Europe/Istanbul");
        LocalDate localToday = LocalDate.now(istanbul);
        AccountId begunAfterMidnight = ready(List.of("MONDAY"), istanbul.getId());
        began(begunAfterMidnight, localToday.minusDays(34).atTime(0, 30).atZone(istanbul).toInstant());
        assertThat(read(get(begunAfterMidnight))).as("34 days on the user's calendar, 35 on UTC's").containsEntry("week", 5);

        // A session at half past midnight on the first day of the user's week just over is that week's, not the one before.
        AccountId sessionAfterMidnight = ready(List.of("MONDAY"), istanbul.getId());
        began(sessionAfterMidnight, localToday.minusDays(35).atTime(12, 0).atZone(istanbul).toInstant());
        session(sessionAfterMidnight, localToday.minusDays(7).atTime(0, 30).atZone(istanbul).toInstant());
        assertThat(rules(sessionAfterMidnight)).isEmpty();
    }

    @Test
    void itIsHealthDataSoItNeedsTheConsentAndAProfile() {
        AccountId stranger = TestSessions.newAccount();
        assertThat(get(stranger)).hasStatus(403).bodyJson().extractingPath("$.code").isEqualTo("CONSENT_REQUIRED");

        AccountId noProfile = TestSessions.newAccount();
        assertThat(send(noProfile, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA))).hasStatusOk();
        assertThat(get(noProfile)).hasStatus(409);
    }

    // ── helpers ─────────────────────────────────────────────────────────────────────────────────────────────

    /** A man on UTC with the consent and a profile training on these days. */
    private AccountId ready(List<String> trainingDays) {
        return ready(trainingDays, "UTC");
    }

    private AccountId ready(List<String> trainingDays, String timeZone) {
        AccountId account = TestSessions.newAccount();
        assertThat(send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA))).hasStatusOk();
        assertThat(send(account, "PUT", "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", trainingDays, "checkInDay", "MONDAY", "timeZone", timeZone)))).hasStatusOk();
        return account;
    }

    /** Training on Mondays, the account begun 35 days ago: today is the first day of week six, week five just over. */
    private AccountId inWeekSix() {
        AccountId account = ready(List.of("MONDAY"));
        began(account, today().minusDays(35));
        return account;
    }

    /** The user's own program: a day on each weekday given (null: a day without one). */
    private void program(AccountId account, String... weekdays) {
        List<Map<String, Object>> days = java.util.Arrays.stream(weekdays).map(weekday -> {
            Map<String, Object> day = new java.util.HashMap<>(Map.of("name", "Full body", "exercises",
                    List.of(Map.of("exerciseId", "bench_press", "sets", 3, "reps", Map.of("min", 6, "max", 10)))));
            if (weekday != null) {
                day.put("weekday", weekday);
            }
            return day;
        }).toList();
        assertThat(send(account, "PUT", "/v1/program", Map.of("days", days))).hasStatusOk();
    }

    private void began(AccountId account, LocalDate day) {
        began(account, day.atTime(12, 0).toInstant(ZoneOffset.UTC));
    }

    private void began(AccountId account, Instant at) {
        jdbc.sql("update identity.account set created_at = :at where id = :id").param("at", at.atOffset(ZoneOffset.UTC))
                .param("id", account.value()).update();
    }

    private static LocalDate today() {
        return LocalDate.now(ZoneOffset.UTC);
    }

    /** A session done on that day: a workout with a working set (K-431) — at noon, or a minute ago when that is today. */
    private void session(AccountId account, LocalDate day) throws Exception {
        Instant noon = day.atTime(12, 0).toInstant(ZoneOffset.UTC);
        session(account, noon.isAfter(Instant.now()) ? Instant.now().minusSeconds(60) : noon);
    }

    private void session(AccountId account, Instant started) throws Exception {
        MvcTestResult workout = send(account, "POST", "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", started.toString()));
        assertThat(workout.getResponse().getStatus()).isLessThan(300);
        Object id = JSON.readValue(workout.getResponse().getContentAsString(), Map.class).get("id");
        assertThat(send(account, "POST", "/v1/workouts/" + id + "/sets", Map.of("clientId", UUID.randomUUID(), "exerciseId", "bench_press",
                "setType", "WORKING", "loadKg", 60, "reps", 8, "rir", 2)).getResponse().getStatus()).isLessThan(300);
    }

    private void meal(AccountId account, LocalDate day) {
        jdbc.sql("insert into nutrition.food (id, name, source, kcal, protein_g, carbs_g, fat_g) values ('fdc:171477', 'Chicken breast, roasted', 'FOUNDATION', 165, 31, 0, 3.6) on conflict (id) do nothing")
                .update();
        assertThat(send(account, "POST", "/v1/meals", Map.of("clientId", UUID.randomUUID(), "eatenAt", day.atTime(12, 30).toInstant(ZoneOffset.UTC).toString(),
                "slot", "LUNCH", "items", List.of(Map.of("foodId", "fdc:171477", "amount", Map.of("quantity", 200, "unit", "g")))))
                .getResponse().getStatus()).isLessThan(300);
    }

    private void weighIn(AccountId account, LocalDate day) {
        assertThat(send(account, "POST", "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt", day.atTime(8, 0).toInstant(ZoneOffset.UTC).toString(),
                "kg", 85.0, "source", "MANUAL")).getResponse().getStatus()).isLessThan(300);
    }

    @SuppressWarnings("unchecked")
    private List<String> rules(AccountId account) throws Exception {
        return ((List<Map<String, Object>>) read(get(account)).get("risk")).stream().map(signal -> (String) signal.get("rule")).toList();
    }

    private MvcTestResult get(AccountId account) {
        return send(account, "GET", "/v1/first-weeks", null);
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
