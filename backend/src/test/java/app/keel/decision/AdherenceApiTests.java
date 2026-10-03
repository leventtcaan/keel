package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.math.BigDecimal;
import java.math.MathContext;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
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
 * The adherence a check-in keeps, counted from the logs through the modules (K-220): on the user's own calendar, from
 * the plan's start, a day without a step count neither done nor missed.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class AdherenceApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final ZoneId ISTANBUL = ZoneId.of("Europe/Istanbul");

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Test
    void theWeeksAreTheUsersOwnAndOnlyWhatWasCountedIsJudged() throws Exception {
        LocalDate today = LocalDate.now(ISTANBUL);
        // The Monday weeks inside the 21 days before today (male window), over by today — worked out here, not by the code.
        List<LocalDate> weeks = new ArrayList<>();
        for (LocalDate monday = today.minusDays(21); monday.plusDays(6).isBefore(today); monday = monday.plusDays(1)) {
            if (monday.getDayOfWeek() == DayOfWeek.MONDAY) {
                weeks.add(monday);
            }
        }
        AccountId account = inIstanbul();
        for (LocalDate week : weeks) {
            // Three weigh-ins a week (four asked), each early morning at home.
            for (int day = 0; day < 3; day++) {
                post(account, "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt", at(week.plusDays(day), 7).toString(),
                        "kg", 82.0, "source", "MANUAL"));
            }
        }
        LocalDate first = weeks.getFirst();
        // Monday 01:30 in Istanbul is Sunday 22:30 UTC: the first week's session on the user's calendar, none in UTC's.
        MvcTestResult workout = send(account, "POST", "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt",
                at(first, 1).plusSeconds(1800).toString()));
        // A session done is one with a working set (K-431).
        post(account, "/v1/workouts/" + JSON.readValue(workout.getResponse().getContentAsString(), Map.class).get("id") + "/sets",
                Map.of("clientId", UUID.randomUUID(), "exerciseId", "bench_press", "setType", "WORKING", "loadKg", 60, "reps", 8, "rir", 2));
        // A day with sleep but no steps is not a step day; a day of 8000 steps is one, done (target 7000).
        send(account, "PUT", "/v1/activity-days", Map.of("day", first.plusDays(1).toString(), "sleepMinutes", 420));
        send(account, "PUT", "/v1/activity-days", Map.of("day", first.plusDays(2).toString(), "steps", 8000));

        assertThat(send(account, "POST", "/v1/check-ins/current/answers", Map.of("clientId", UUID.randomUUID(),
                "weekOf", CheckInWeek.weekOf(today, DayOfWeek.MONDAY).toString(), "answers", List.of()))).hasStatusOk();

        // Per week: 1 session and 4 weigh-ins asked, 3 weighed; the first week also its session and its one step day.
        int w = weeks.size();
        BigDecimal expected = BigDecimal.valueOf(3L * w + 2).divide(BigDecimal.valueOf(5L * w + 1), MathContext.DECIMAL64);
        String snapshot = jdbc.sql("select snapshot::text from decision.weekly_call where account_id = :a").param("a", account.value())
                .query(String.class).single();
        assertThat(JSON.readValue(snapshot, StoredSnapshot.class).checkIn().adherence()).isEqualByComparingTo(expected);
    }

    @Test
    void theSessionsTheWeeksAskForAreTheProgramsDays() throws Exception {
        // K-530 (ADR-043 #74): the profile trains on Mondays, the program on three days — each week asks for three.
        LocalDate today = LocalDate.now(ISTANBUL);
        List<LocalDate> weeks = new ArrayList<>();
        for (LocalDate monday = today.minusDays(21); monday.plusDays(6).isBefore(today); monday = monday.plusDays(1)) {
            if (monday.getDayOfWeek() == DayOfWeek.MONDAY) {
                weeks.add(monday);
            }
        }
        AccountId account = inIstanbul();
        assertThat(send(account, "PUT", "/v1/program", Map.of("days", List.of("MONDAY", "WEDNESDAY", "FRIDAY").stream()
                .map(weekday -> Map.of("name", "Full body", "weekday", weekday, "exercises",
                        List.of(Map.of("exerciseId", "bench_press", "sets", 3, "reps", Map.of("min", 6, "max", 10))))).toList()))
                .getResponse().getStatus()).isLessThan(300);
        // Made before the window's weeks: they were asked for by it (a week before a program is K-530's question 2).
        jdbc.sql("update training.program set created_at = now() - interval '60 days' where account_id = :a").param("a", account.value()).update();
        MvcTestResult workout = send(account, "POST", "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt",
                at(weeks.getFirst(), 12).toString()));
        post(account, "/v1/workouts/" + JSON.readValue(workout.getResponse().getContentAsString(), Map.class).get("id") + "/sets",
                Map.of("clientId", UUID.randomUUID(), "exerciseId", "bench_press", "setType", "WORKING", "loadKg", 60, "reps", 8, "rir", 2));
        // A weigh-in today, in no week over: the call has a weight to go by.
        post(account, "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt", Instant.now().minusSeconds(3600).toString(),
                "kg", 82.0, "source", "MANUAL"));

        assertThat(send(account, "POST", "/v1/check-ins/current/answers", Map.of("clientId", UUID.randomUUID(),
                "weekOf", CheckInWeek.weekOf(today, DayOfWeek.MONDAY).toString(), "answers", List.of()))).hasStatusOk();

        // Per week: 3 sessions (not the profile's 1) and 4 weigh-ins asked; one session done in all.
        BigDecimal expected = BigDecimal.ONE.divide(BigDecimal.valueOf(7L * weeks.size()), MathContext.DECIMAL64);
        String snapshot = jdbc.sql("select snapshot::text from decision.weekly_call where account_id = :a").param("a", account.value())
                .query(String.class).single();
        assertThat(JSON.readValue(snapshot, StoredSnapshot.class).checkIn().adherence()).isEqualByComparingTo(expected);
    }

    @Test
    void aPlanBegunThisWeekHasNoWeeksToJudgeYet() throws Exception {
        LocalDate today = LocalDate.now(ISTANBUL);
        AccountId account = inIstanbul();
        jdbc.sql("update decision.plan set phase_start = :today, plan_start = :today where account_id = :a").param("today", today)
                .param("a", account.value()).update();
        post(account, "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt", Instant.now().minusSeconds(3600).toString(),
                "kg", 82.0, "source", "MANUAL"));

        assertThat(send(account, "POST", "/v1/check-ins/current/answers", Map.of("clientId", UUID.randomUUID(),
                "weekOf", CheckInWeek.weekOf(today, DayOfWeek.MONDAY).toString(), "answers", List.of()))).hasStatusOk();

        String snapshot = jdbc.sql("select snapshot::text from decision.weekly_call where account_id = :a").param("a", account.value())
                .query(String.class).single();
        assertThat(JSON.readValue(snapshot, StoredSnapshot.class).checkIn().adherence()).isNull();
    }

    /** A man in Istanbul training on Mondays, on a cut begun two months ago. */
    private AccountId inIstanbul() {
        AccountId account = TestSessions.newAccount();
        send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA));
        send(account, "PUT", "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", ISTANBUL.getId())));
        LocalDate began = LocalDate.now(ISTANBUL).minusDays(60);
        jdbc.sql("""
                insert into decision.plan (account_id, phase, phase_start, plan_start, target_kcal, observing_maintenance)
                values (:a, 'CUT', :began, :began, 2600, false)""").param("a", account.value()).param("began", began).update();
        return account;
    }

    private static Instant at(LocalDate day, int hour) {
        return day.atTime(LocalTime.of(hour, 0)).atZone(ISTANBUL).toInstant();
    }

    private void post(AccountId account, String uri, Map<String, Object> body) {
        assertThat(send(account, "POST", uri, body).getResponse().getStatus()).as(uri).isLessThan(300);
    }

    private MvcTestResult send(AccountId account, String method, String uri, Object body) {
        var request = switch (method) {
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
