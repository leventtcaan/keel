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
 * The daily number on the Today screen (K-420, K-111, U15): this week's four kinds of planned action counted from the
 * logs on the user's calendar, and the record of weeks on track since the first call — never reset (U7).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class ConsistencyApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final ZoneId ISTANBUL = ZoneId.of("Europe/Istanbul");

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Test
    void thisWeeksActionsAreCountedFromTheLogsOnTheUsersCalendar() throws Exception {
        LocalDate today = LocalDate.now(ISTANBUL);
        AccountId account = afterTheFirstCall();
        // Today: a session and a weigh-in (done today), and a step count (today is not over: not judged yet).
        workout(account, "WORKING");
        send(account, "POST", "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt", Instant.now().minusSeconds(1).toString(),
                "kg", 82.0, "source", "MANUAL"));
        send(account, "PUT", "/v1/activity-days", Map.of("day", today.toString(), "steps", 12000));

        Map<String, Object> consistency = read(get(account));

        assertThat(consistency).containsEntry("weekOf", today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).toString());
        assertThat(consistency.get("training")).isEqualTo(Map.of("planned", 2, "done", 1));
        assertThat((Map<String, Object>) consistency.get("weighIns")).containsEntry("done", 1);
        assertThat(consistency.get("steps")).isEqualTo(Map.of("planned", 0, "done", 0));
        assertThat((int) consistency.get("done")).isEqualTo(2);
        assertThat(consistency).containsKeys("planned", "percent");
        // The first call is this week: no week is over since, nothing counted yet.
        assertThat(consistency.get("record")).isEqualTo(Map.of("onTrackWeeks", 0, "countedWeeks", 0, "currentRun", 0, "forgivenWeeks", 0));
    }

    @Test
    void onlyAWorkoutWithAWorkingSetIsASessionDone() throws Exception {
        // K-431 (ADR-037 #39): a workout opened and left, or only warmed up in, is not a session done.
        AccountId account = afterTheFirstCall();
        workout(account, null);
        workout(account, "WARM_UP");

        assertThat(read(get(account)).get("training")).isEqualTo(Map.of("planned", 2, "done", 0));

        workout(account, "WORKING");

        assertThat(read(get(account)).get("training")).isEqualTo(Map.of("planned", 2, "done", 1));
    }

    @Test
    void aWorkoutOfSetsToFailureIsASessionDone() throws Exception {
        // A working set is any set that is not a warm-up, close to failure (docs/sozluk.md): a set taken to failure is
        // one, logged as FAILURE (K-218). Push-ups to failure are a session done.
        AccountId account = afterTheFirstCall();
        workout(account, "FAILURE");

        assertThat(read(get(account)).get("training")).isEqualTo(Map.of("planned", 2, "done", 1));
    }

    @Test
    void aPlanWithoutACallCountsFromThePlansPhase() throws Exception {
        // K-420 review: no call yet (a plan set some other way) — the record begins where the phase began, not a 500.
        AccountId account = consenting();
        LocalDate began = LocalDate.now(ISTANBUL).minusDays(30);
        jdbc.sql("""
                insert into decision.plan (account_id, phase, phase_start, plan_start, target_kcal, observing_maintenance)
                values (:a, 'CUT', :began, :began, 2600, false)""").param("a", account.value()).param("began", began).update();

        // The Monday weeks from the phase's start that are over by today — worked out here, not by the code: 3 or 4.
        int over = 0;
        for (LocalDate day = began; day.plusDays(6).isBefore(LocalDate.now(ISTANBUL)); day = day.plusDays(1)) {
            over += day.getDayOfWeek() == DayOfWeek.MONDAY ? 1 : 0;
        }

        Map<String, Object> consistency = read(get(account));

        // Nothing logged in them: every week counted (two sessions asked), none on track (U7: counted, never reset).
        assertThat((Map<String, Object>) consistency.get("record")).containsEntry("countedWeeks", over).containsEntry("onTrackWeeks", 0);
    }

    @Test
    void theProgramsDaysAreTheSessionsAskedWhateverTheProfileSays() throws Exception {
        // K-530 (ADR-043 #74): a program built on four days, a profile saying three — one number, the program's.
        AccountId account = afterTheFirstCall();
        trainingDays(account, "MONDAY", "WEDNESDAY", "FRIDAY");
        program(account, "MONDAY", "TUESDAY", "THURSDAY", "SATURDAY");
        inForceSinceLastWeek(account);

        assertThat(read(get(account)).get("training")).isEqualTo(Map.of("planned", 4, "done", 0));
    }

    @Test
    void aProgramDayWithoutAWeekdayIsStillASessionAsked() throws Exception {
        // The program's days are counted, put on a weekday or not; the weekdays only say which day (K-527).
        AccountId account = afterTheFirstCall();
        trainingDays(account, "MONDAY", "WEDNESDAY", "FRIDAY");
        program(account, "MONDAY", null, null, null);
        inForceSinceLastWeek(account);

        assertThat(read(get(account)).get("training")).isEqualTo(Map.of("planned", 4, "done", 0));
    }

    @Test
    void withoutAProgramTheProfilesDaysAreTheSessionsAsked() throws Exception {
        AccountId account = afterTheFirstCall();
        trainingDays(account, "MONDAY", "WEDNESDAY", "FRIDAY");

        assertThat(read(get(account)).get("training")).isEqualTo(Map.of("planned", 3, "done", 0));
    }

    @Test
    void aProgramRaisedFromThreeToFiveDaysLeavesTheWeeksGoneByAsTheyWere() throws Exception {
        // K-535 (ADR-045 #79): each week is judged by the program it had. Three sessions and two weigh-ins a week are 5
        // of 7, on track (on_track_min_ratio); judged by five days they would be 5 of 9, not (U7: a better plan does not
        // make the weeks before look worse).
        AccountId account = consenting();
        LocalDate today = LocalDate.now(ISTANBUL);
        LocalDate began = today.minusDays(22);
        jdbc.sql("""
                insert into decision.plan (account_id, phase, phase_start, plan_start, target_kcal, observing_maintenance)
                values (:a, 'CUT', :began, :began, 2600, false)""").param("a", account.value()).param("began", began).update();
        program(account, "MONDAY", "WEDNESDAY", "FRIDAY");
        // The API makes a program only now: this one is moved back to before the plan, as if made then.
        jdbc.sql("update training.program_history set effective_from = :then where account_id = :a").param("a", account.value())
                .param("then", began.minusDays(7).atStartOfDay(ISTANBUL).toOffsetDateTime()).update();
        for (LocalDate week = began.with(TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY)); week.plusDays(6).isBefore(today); week = week.plusWeeks(1)) {
            for (int day : new int[] {0, 2, 4}) {
                workout(account, "WORKING", week.plusDays(day).atTime(12, 0).atZone(ISTANBUL).toInstant());
            }
            for (int day : new int[] {0, 1}) {
                send(account, "POST", "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt",
                        week.plusDays(day).atTime(8, 0).atZone(ISTANBUL).toInstant().toString(), "kg", 82.0, "source", "MANUAL"));
            }
        }
        Map<String, Object> before = (Map<String, Object>) read(get(account)).get("record");
        assertThat((int) before.get("countedWeeks")).as("weeks over since the plan began").isGreaterThanOrEqualTo(2);
        assertThat(before.get("onTrackWeeks")).isEqualTo(before.get("countedWeeks"));

        program(account, "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY");

        Map<String, Object> after = read(get(account));
        assertThat(after.get("record")).isEqualTo(before);
        // This week began with three days asked: the five are asked from next Monday.
        assertThat(after.get("training")).isEqualTo(Map.of("planned", 3, "done", 0));
    }

    @Test
    void aLoneMissedWeekInARunIsAForgivenWeekInTheRecord() throws Exception {
        // K-608: "11 of 12 weeks on track · 1 forgiven week used". On track, missed, then on track: the miss is forgiven.
        // Two sessions (the profile's days) and three weigh-ins of four are 5 of 6, on track (on_track_min_ratio).
        AccountId account = consenting();
        LocalDate today = LocalDate.now(ISTANBUL);
        LocalDate began = today.minusDays(30);
        jdbc.sql("""
                insert into decision.plan (account_id, phase, phase_start, plan_start, target_kcal, observing_maintenance)
                values (:a, 'CUT', :began, :began, 2600, false)""").param("a", account.value()).param("began", began).update();
        int index = 0;
        for (LocalDate week = began.with(TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY)); week.plusDays(6).isBefore(today); week = week.plusWeeks(1)) {
            if (index++ == 1) {
                continue; // the second week: nothing done
            }
            for (int day : new int[] {0, 3}) {
                workout(account, "WORKING", week.plusDays(day).atTime(12, 0).atZone(ISTANBUL).toInstant());
            }
            for (int day : new int[] {0, 1, 2}) {
                send(account, "POST", "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt",
                        week.plusDays(day).atTime(8, 0).atZone(ISTANBUL).toInstant().toString(), "kg", 82.0, "source", "MANUAL"));
            }
        }

        Map<String, Object> record = (Map<String, Object>) read(get(account)).get("record");

        assertThat(index).as("weeks over since the plan began").isGreaterThanOrEqualTo(3);
        assertThat(record).containsEntry("countedWeeks", index).containsEntry("onTrackWeeks", index - 1).containsEntry("forgivenWeeks", 1);
    }

    @Test
    void beforeTheFirstCallNothingIsPlannedYet() {
        AccountId account = consenting();

        assertThat(get(account)).hasStatus(404).bodyJson().extractingPath("$.code").isEqualTo("NOT_FOUND");
    }

    @Test
    void itIsHealthDataSoItNeedsTheConsent() {
        AccountId account = afterTheFirstCall();
        assertThat(mvc.delete().uri("/v1/consents/HEALTH_DATA?confirmDataDeletion=true").header("Authorization", TestSessions.bearer(context, account))
                .exchange()).hasStatusOk();

        assertThat(get(account)).hasStatus(403).bodyJson().extractingPath("$.code").isEqualTo("CONSENT_REQUIRED");
    }

    /** A man in Istanbul training on Mondays and Thursdays, whose first weekly call was made this week. */
    private AccountId afterTheFirstCall() {
        AccountId account = consenting();
        LocalDate today = LocalDate.now(ISTANBUL);
        send(account, "POST", "/v1/check-ins/current/answers", Map.of("clientId", UUID.randomUUID(),
                "weekOf", CheckInWeek.weekOf(today, DayOfWeek.MONDAY).toString(), "answers", List.of()));
        return account;
    }

    private AccountId consenting() {
        AccountId account = TestSessions.newAccount();
        send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA));
        send(account, "PUT", "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY", "THURSDAY"), "checkInDay", "MONDAY", "timeZone", ISTANBUL.getId())));
        return account;
    }

    /** The profile's training days, the rest of it as {@link #consenting} has it. */
    private void trainingDays(AccountId account, String... days) {
        send(account, "PUT", "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of(days), "checkInDay", "MONDAY", "timeZone", ISTANBUL.getId())));
    }

    /**
     * The program in force since before this week began (K-535, ADR-049): a program made during the week asks that week
     * only the fewer of its days and the ones before it.
     */
    private void inForceSinceLastWeek(AccountId account) {
        jdbc.sql("update training.program_history set effective_from = now() - interval '8 days' where account_id = :a")
                .param("a", account.value()).update();
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
        send(account, "PUT", "/v1/program", Map.of("days", days));
    }

    private MvcTestResult get(AccountId account) {
        return mvc.get().uri("/v1/consistency").header("Authorization", TestSessions.bearer(context, account)).exchange();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> read(MvcTestResult result) throws Exception {
        assertThat(result).hasStatusOk();
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }

    /** A workout started a second ago, with one set of this type — or none. */
    private void workout(AccountId account, String setType) throws Exception {
        workout(account, setType, Instant.now().minusSeconds(1));
    }

    private void workout(AccountId account, String setType, Instant startedAt) throws Exception {
        MvcTestResult started = send(account, "POST", "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", startedAt.toString()));
        if (setType != null) {
            String id = (String) JSON.readValue(started.getResponse().getContentAsString(), Map.class).get("id");
            // A set to failure has no reps in reserve to give (K-218): none is sent.
            Map<String, Object> set = new java.util.HashMap<>(Map.of("clientId", UUID.randomUUID(), "exerciseId", "bench_press",
                    "setType", setType, "loadKg", 60, "reps", 8));
            if (!"FAILURE".equals(setType)) {
                set.put("rir", 2);
            }
            send(account, "POST", "/v1/workouts/" + id + "/sets", set);
        }
    }

    private MvcTestResult send(AccountId account, String method, String uri, Object body) {
        var request = "PUT".equals(method) ? mvc.put() : mvc.post();
        MvcTestResult result = request.uri(uri).header("Authorization", TestSessions.bearer(context, account))
                .contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(body)).exchange();
        assertThat(result.getResponse().getStatus()).as(method + " " + uri).isLessThan(300);
        return result;
    }
}
