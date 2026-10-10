package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.engine.CheckIn;
import app.keel.engine.Phase;
import app.keel.engine.Sex;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
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
 * The coach's own questions (K-512, ADR-039): read from the user's logs, asked in the app, once each. An answer is
 * kept (health data: behind the consent, deleted with it) and never changes a call; some come with a short reply.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class PromptsApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Test
    @SuppressWarnings("unchecked")
    void stepsFallingUnderTheTargetAreAskedAboutWithTheRuleAndItsSource() throws Exception {
        AccountId account = ready();
        stepsDropped(account);

        List<Map<String, Object>> prompts = list(account);

        assertThat(prompts).singleElement().satisfies(prompt -> {
            assertThat(prompt).containsEntry("rule", "steps_dropped").containsEntry("key", lastMonday().toString())
                    .containsEntry("copyKey", "prompt.steps_dropped").containsEntry("choices", List.of("BUSY", "LESS"));
            // The kind of source only (K-523, ADR-041 #72): the research path stays on the server.
            assertThat((Map<String, Object>) prompt.get("source")).isEqualTo(Map.of("tag", "EXPERIENCE"));
        });
    }

    @Test
    void answeredOnceItIsNotAskedAgainAndSomeAnswersHaveAReply() throws Exception {
        AccountId account = ready();
        stepsDropped(account);

        MvcTestResult answered = answer(account, "steps_dropped", lastMonday().toString(), "LESS");

        assertThat(read(answered)).containsEntry("replyCopyKey", "prompt.steps_dropped.reply.less");
        assertThat(list(account)).isEmpty();
        assertThat(read(answer(account, "steps_dropped", lastMonday().toString(), "LESS"))).as("the same answer again: the same reply")
                .containsEntry("replyCopyKey", "prompt.steps_dropped.reply.less");
    }

    @Test
    void anAnswerThatTakesTheUserElsewhereHasNoReply() throws Exception {
        AccountId account = ready();
        assertThat(read(answer(account, "steps_dropped", lastMonday().toString(), "BUSY"))).doesNotContainKey("replyCopyKey");
    }

    @Test
    void whatIsNotAQuestionOrNotItsAnswerIsRefused() {
        AccountId account = ready();
        assertThat(answer(account, "no_such_rule", lastMonday().toString(), "OK")).hasStatus(400);
        assertThat(answer(account, "loads_dropped", lastMonday().toString(), "LESS")).hasStatus(400);
        assertThat(answer(account, "loads_dropped", "not-a-day", "OK")).hasStatus(400);
        assertThat(answer(account, "Steps-Dropped", lastMonday().toString(), "LESS")).as("not a rule's name at all").hasStatus(400);
    }

    @Test
    void aDeclaredWeekAsksNothing() throws Exception {
        AccountId account = ready();
        stepsDropped(account);
        assertThat(send(account, "PUT", "/v1/state", Map.of("kind", "BUSY"))).hasStatusOk();

        assertThat(list(account)).isEmpty();
    }

    @Test
    void aWeekDeclaredSickIsNoDropInItsStepsOnceItIsOver() throws Exception {
        AccountId account = ready();
        stepsDropped(account);
        // Sick Monday to Friday last week, back since: two days left are not a week's steps.
        jdbc.sql("""
                insert into decision.declared_state (id, account_id, kind, starts_on, ends_on, created_at)
                values (:id, :a, 'SICK', :from, :to, now())""").param("id", UUID.randomUUID()).param("a", account.value())
                .param("from", lastMonday()).param("to", lastMonday().plusDays(4)).update();

        assertThat(list(account)).isEmpty();
    }

    @Test
    void twoPlannedDaysSinceTheLastSessionAreAskedAboutFromTheFirst() throws Exception {
        AccountId account = ready();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate trained = today.minusDays(15);
        session(account, trained);
        // Saved today, the profile's training days count from today: nothing missed yet.
        assertThat(list(account)).isEmpty();

        // Set long ago: the 14 days between the session and today hold two Mondays, missed.
        trainingDaysSetLongAgo(account);
        LocalDate firstMissed = trained.with(TemporalAdjusters.next(DayOfWeek.MONDAY));

        assertThat(list(account)).singleElement().satisfies(prompt -> assertThat(prompt).containsEntry("rule", "sessions_missed")
                .containsEntry("key", firstMissed.toString()));
    }

    @Test
    void onlyANewSetOfTrainingDaysStartsTheCountAgain() throws Exception {
        AccountId account = ready();
        session(account, LocalDate.now(ZoneOffset.UTC).minusDays(15));
        trainingDaysSetLongAgo(account);
        // The units switched (the phone saves the whole profile): the same days, the same miss.
        assertThat(send(account, "PUT", "/v1/profile", profile("IMPERIAL", List.of("MONDAY")))).hasStatusOk();
        assertThat(list(account)).extracting(prompt -> prompt.get("rule")).containsExactly("sessions_missed");
        // New days: they are asked for from today.
        assertThat(send(account, "PUT", "/v1/profile", profile("IMPERIAL", List.of("MONDAY", "THURSDAY")))).hasStatusOk();
        assertThat(list(account)).isEmpty();
        // The same days in another order are the same days.
        trainingDaysSetLongAgo(account);
        assertThat(send(account, "PUT", "/v1/profile", profile("IMPERIAL", List.of("THURSDAY", "MONDAY")))).hasStatusOk();
        assertThat(list(account)).extracting(prompt -> prompt.get("rule")).containsExactly("sessions_missed");
    }

    @Test
    void theProgramsDaysAreTheOnesMissedAndTheProfilesOnlyWhenItHasNone() throws Exception {
        // K-527 (ADR-041 #64): a program built on other days than the profile's — the misses are its days. The session is
        // on a Thursday 15-21 days ago, so the profile's next Monday (+4) comes before the program's Wednesday (+6): a mix
        // of the two would ask from the Monday.
        AccountId account = ready(); // the profile trains on Monday
        LocalDate trained = sessionOnAThursday(account);
        program(account, "WEDNESDAY");
        trainingDaysSetLongAgo(account);

        assertThat(firstMissed(account)).isEqualTo(trained.with(TemporalAdjusters.next(DayOfWeek.WEDNESDAY)));

        // A program whose days have no weekday: the profile's Monday.
        program(account, (String) null);
        assertThat(firstMissed(account)).isEqualTo(trained.with(TemporalAdjusters.next(DayOfWeek.MONDAY)));
        // Some days with a weekday, some without: the ones it puts on a weekday.
        program(account, "WEDNESDAY", null);
        assertThat(firstMissed(account)).isEqualTo(trained.with(TemporalAdjusters.next(DayOfWeek.WEDNESDAY)));
    }

    @Test
    void theProgramsDaysCountFromWhenItWasMadeNotFromAChangeOfTheProfilesDays() throws Exception {
        AccountId account = ready();
        LocalDate trained = sessionOnAThursday(account);
        program(account, "WEDNESDAY");
        trainingDaysSetLongAgo(account);
        // New profile days change nothing the program's days are counted from (K-527 review).
        assertThat(send(account, "PUT", "/v1/profile", profile("METRIC", List.of("MONDAY", "THURSDAY")))).hasStatusOk();
        assertThat(firstMissed(account)).isEqualTo(trained.with(TemporalAdjusters.next(DayOfWeek.WEDNESDAY)));
        // A new program on new days: asked for from when it was made — today, nothing missed yet.
        assertThat(send(account, "PUT", "/v1/program", Map.of("days", List.of(Map.of("name", "Full body", "weekday", "FRIDAY", "exercises",
                List.of(Map.of("exerciseId", "bench_press", "sets", 3, "reps", Map.of("min", 6, "max", 10)))))))).hasStatusOk();
        assertThat(list(account)).isEmpty();
    }

    @Test
    void aDayAddedToTheProgramIsNotAMissOnTheDaysBeforeItWasAdded() throws Exception {
        // K-1012 (ADR-073 Ek 9): the days between the last session and today are asked for by the program's days; a day added
        // today was not asked for on the days before. Two days of the program, the first of them missed (one miss: no question);
        // a third day on the day after it would be the second miss if it counted from before it was added.
        AccountId account = ready();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        session(account, today.minusDays(4));
        assertThat(send(account, "POST", "/v1/program/generate",
                Map.of("trainingDays", List.of(today.minusDays(3).getDayOfWeek().name(), today.plusDays(1).getDayOfWeek().name())))).hasStatusOk();
        programMadeLongAgo(account);
        assertThat(list(account)).as("one planned day passed since the session: no question yet").isEmpty();

        assertThat(send(account, "POST", "/v1/program/days", Map.of("weekday", today.minusDays(2).getDayOfWeek().name()))).hasStatusOk();

        assertThat(list(account)).isEmpty();
    }

    @Test
    void theLaddersWeekOffIsNoMiss() throws Exception {
        AccountId account = ready();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        session(account, today.minusDays(15));
        trainingDaysSetLongAgo(account);
        jdbc.sql("""
                insert into training.program_change (id, account_id, call_id, kind, starts_on, ends_on)
                values (:id, :a, :call, 'REST_WEEK', :from, :to)""").param("id", UUID.randomUUID()).param("a", account.value())
                .param("call", UUID.randomUUID()).param("from", today.minusDays(14)).param("to", today.minusDays(1)).update();

        assertThat(list(account)).isEmpty();
    }

    @Test
    void theDeficitsFirstDaysAskAboutHungerFromTheCallThatBeganIt() throws Exception {
        AccountId account = ready();
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate cutBegan = today.minusDays(10);
        // Watched at maintenance for ten days; yesterday's call set the first target under it.
        String watched = plan(cutBegan, cutBegan, 2600, true);
        String deficit = plan(cutBegan, today.minusDays(1), 2300, false);
        jdbc.sql("""
                insert into decision.plan (account_id, phase, phase_start, plan_start, target_kcal, observing_maintenance)
                values (:a, 'CUT', :began, :start, 2300, false)""").param("a", account.value()).param("began", cutBegan)
                .param("start", today.minusDays(1)).update();
        jdbc.sql("""
                insert into decision.weekly_call (id, account_id, client_id, week_of, made_on, decided_at, parameters_hash, snapshot, decision,
                    application, applied_at, plan_before, plan_after)
                values (:id, :a, :client, :week, :made, now() - interval '1 day', 'test', cast(:snapshot as jsonb), '{}', 'APPLIED',
                    now() - interval '1 day', cast(:before as jsonb), cast(:after as jsonb))""").param("id", UUID.randomUUID()).param("a", account.value())
                .param("snapshot", JSON.writeValueAsString(new StoredSnapshot(today.minusDays(1), Sex.MALE, Phase.CUT, cutBegan, List.of(), null, null,
                        new StoredSnapshot.Answered(CheckIn.Look.UNKNOWN, CheckIn.Training.UNKNOWN, CheckIn.Recovery.UNKNOWN, CheckIn.Waist.UNKNOWN,
                                null, CheckIn.Appetite.UNKNOWN), null, true, cutBegan, null, null, false, null, null, null)))
                .param("client", UUID.randomUUID()).param("week", today.minusDays(1)).param("made", today.minusDays(1))
                .param("before", watched).param("after", deficit).update();

        assertThat(list(account)).singleElement().satisfies(prompt -> assertThat(prompt).containsEntry("rule", "hunger_first_days")
                .containsEntry("key", today.minusDays(1).toString()));
    }

    @Test
    void theLoadsCompareTheTwoCalendarWeeksJustOverOnACut() throws Exception {
        AccountId account = ready();
        jdbc.sql("""
                insert into decision.plan (account_id, phase, phase_start, plan_start, target_kcal, observing_maintenance)
                values (:a, 'CUT', :began, :began, 2600, true)""").param("a", account.value())
                .param("began", LocalDate.now(ZoneOffset.UTC).minusDays(60)).update();
        assertThat(send(account, "PUT", "/v1/program", Map.of("days", List.of(Map.of("name", "Full body", "weekday", "MONDAY", "exercises",
                List.of(Map.of("exerciseId", "bench_press", "sets", 3, "reps", Map.of("min", 6, "max", 10)))))))).hasStatusOk();
        jdbc.sql("with made as (update training.program set created_at = now() - interval '60 days' where account_id = :a returning created_at) "
                + "update training.program_history set effective_from = (select created_at from made) where account_id = :a").param("a", account.value()).update();
        // The week before last at 80 kg, last week at 70; today 90 — read as of today the drop would not show.
        session(account, lastMonday().minusDays(5), 80);
        session(account, lastMonday().plusDays(2), 70);
        session(account, LocalDate.now(ZoneOffset.UTC), 90);

        assertThat(list(account)).singleElement().satisfies(prompt -> assertThat(prompt).containsEntry("rule", "loads_dropped")
                .containsEntry("key", lastMonday().toString()));
    }

    @Test
    void theyAreHealthDataSoTheyNeedTheConsent() {
        AccountId account = TestSessions.newAccount();
        assertThat(send(account, "GET", "/v1/prompts", null)).hasStatus(403).bodyJson().extractingPath("$.code").isEqualTo("CONSENT_REQUIRED");
        assertThat(answer(account, "loads_dropped", lastMonday().toString(), "OK")).hasStatus(403);
    }

    /** A man on UTC with the consent and a profile, training on Mondays. */
    private AccountId ready() {
        AccountId account = TestSessions.newAccount();
        assertThat(send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA))).hasStatusOk();
        assertThat(send(account, "PUT", "/v1/profile", profile("METRIC", List.of("MONDAY")))).hasStatusOk();
        return account;
    }

    private static Map<String, Object> profile(String units, List<String> trainingDays) {
        return Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996, "programChoice", "BUILD_ONE_FOR_ME", "units", units,
                "schedule", Map.of("trainingDays", trainingDays, "checkInDay", "MONDAY", "timeZone", "UTC"));
    }

    /** The calendar week before last on 9,000 steps a day, the last one on 4,000: under the starting target (7,000). */
    private void stepsDropped(AccountId account) {
        for (int day = 0; day < 14; day++) {
            LocalDate date = lastMonday().minusWeeks(1).plusDays(day);
            assertThat(send(account, "PUT", "/v1/activity-days", Map.of("day", date.toString(), "steps", day < 7 ? 9000 : 4000))).hasStatusOk();
        }
    }

    /** The Monday of the calendar week just over: the week a drop is asked about. */
    private static LocalDate lastMonday() {
        return LocalDate.now(ZoneOffset.UTC).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).minusWeeks(1);
    }

    /** A session done on that day: a workout with a working set (K-431) — at noon, or a minute ago when that is today. */
    private void session(AccountId account, LocalDate day) throws Exception {
        session(account, day, 60);
    }

    private void session(AccountId account, LocalDate day, double benchKg) throws Exception {
        Instant noon = day.atTime(12, 0).toInstant(ZoneOffset.UTC);
        Instant started = noon.isAfter(Instant.now()) ? Instant.now().minusSeconds(60) : noon;
        MvcTestResult workout = send(account, "POST", "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", started.toString()));
        assertThat(workout.getResponse().getStatus()).isLessThan(300);
        Object id = JSON.readValue(workout.getResponse().getContentAsString(), Map.class).get("id");
        assertThat(send(account, "POST", "/v1/workouts/" + id + "/sets", Map.of("clientId", UUID.randomUUID(), "exerciseId", "bench_press",
                "setType", "WORKING", "loadKg", benchKg, "reps", 8, "rir", 2)).getResponse().getStatus()).isLessThan(300);
    }

    /** A program of a day on each weekday given (null: a day without one), as if made 60 days ago. */
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
        programMadeLongAgo(account);
    }

    /** The account's program, and the days it asks for, as if made 60 days ago. */
    private void programMadeLongAgo(AccountId account) {
        jdbc.sql("with made as (update training.program set created_at = now() - interval '60 days' where account_id = :a returning created_at) "
                + "update training.program_history set effective_from = (select created_at from made) where account_id = :a").param("a", account.value()).update();
    }

    /** A session on the Thursday 15 to 21 days ago: at least two of any weekday since, and Monday before Wednesday. */
    private LocalDate sessionOnAThursday(AccountId account) throws Exception {
        LocalDate trained = LocalDate.now(ZoneOffset.UTC).minusDays(15).with(TemporalAdjusters.previousOrSame(DayOfWeek.THURSDAY));
        session(account, trained);
        return trained;
    }

    /** The day the one sessions_missed question asks from. */
    private LocalDate firstMissed(AccountId account) throws Exception {
        List<Map<String, Object>> prompts = list(account);
        assertThat(prompts).singleElement().satisfies(prompt -> assertThat(prompt).containsEntry("rule", "sessions_missed"));
        return LocalDate.parse((String) prompts.getFirst().get("key"));
    }

    /** The profile's training days as if set 60 days ago. */
    private void trainingDaysSetLongAgo(AccountId account) {
        jdbc.sql("update profile.profile set updated_at = now() - interval '60 days', training_days_since = now() - interval '60 days' where account_id = :a")
                .param("a", account.value()).update();
    }

    /** A plan as an applied call keeps it (CallStore.Plan). */
    private static String plan(LocalDate phaseStart, LocalDate planStart, int kcal, boolean watched) {
        return JSON.writeValueAsString(Map.of("phase", "CUT", "phaseStart", phaseStart.toString(), "planStart", planStart.toString(),
                "targetKcal", kcal, "observingMaintenance", watched));
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> list(AccountId account) throws Exception {
        MvcTestResult result = send(account, "GET", "/v1/prompts", null);
        assertThat(result).hasStatusOk();
        return JSON.readValue(result.getResponse().getContentAsString(), List.class);
    }

    private MvcTestResult answer(AccountId account, String rule, String key, String choice) {
        return send(account, "POST", "/v1/prompts/" + rule + "/answers", Map.of("key", key, "choice", choice));
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
