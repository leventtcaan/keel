package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.engine.ParameterKey;
import app.keel.engine.ParameterSet;
import app.keel.engine.Sex;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
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
 * Coming back after a gap (K-1020, ADR-077 #5 and Ek 8; contract ReturnSummary): the days since the last log of any kind,
 * asked from seven of them and once per gap, what is offered first, the day of the next call, and what picking up where the
 * user left off does to the program. Days are counted on the server's clock in UTC, the profile's zone.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class ReturnApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Autowired
    Clock clock;

    @Autowired
    ParameterSet parameters;

    @Test
    void aNewUserWithNoLogIsNotAsked() throws Exception {
        AccountId account = account(true);

        Map<String, Object> summary = read(send(account, "GET", "/v1/return", null));

        assertThat(summary).containsEntry("awayDays", 0).containsEntry("shouldPrompt", false).containsEntry("suggested", "PICK_UP");
        assertThat(send(account, "POST", "/v1/return", Map.of("choice", "PICK_UP"))).hasStatus(409);
    }

    @Test
    void sixDaysAwayIsNotAskedAndSevenIs() throws Exception {
        AccountId six = account(true);
        session(six, 6);
        AccountId seven = account(true);
        session(seven, 7);

        assertThat(read(send(six, "GET", "/v1/return", null))).containsEntry("awayDays", 6).containsEntry("shouldPrompt", false);
        assertThat(read(send(seven, "GET", "/v1/return", null))).containsEntry("awayDays", 7).containsEntry("shouldPrompt", true);
        assertThat(send(six, "POST", "/v1/return", Map.of("choice", "PICK_UP"))).as("no gap to answer").hasStatus(409);
    }

    @Test
    void theLastLogIsTheLatestOfASessionACardioSessionAWeighInAndAMeal() throws Exception {
        AccountId account = account(true);
        session(account, 40);
        cardio(account, 20);
        assertThat(read(send(account, "GET", "/v1/return", null))).containsEntry("awayDays", 20);

        weighIn(account, 12);
        assertThat(read(send(account, "GET", "/v1/return", null))).containsEntry("awayDays", 12);

        meal(account, 9);
        assertThat(read(send(account, "GET", "/v1/return", null))).containsEntry("awayDays", 9).containsEntry("shouldPrompt", true);
    }

    @Test
    void withoutTheHealthDataConsentOnlyTheSessionsAndCardioAreCounted() throws Exception {
        AccountId account = account(false);
        session(account, 30);

        assertThat(read(send(account, "GET", "/v1/return", null))).containsEntry("awayDays", 30).containsEntry("shouldPrompt", true);
    }

    @Test
    void easeBackIsOfferedWhenTheLastSessionIsThreeWeeksBackAndPickUpBefore() throws Exception {
        AccountId threeWeeks = account(true);
        session(threeWeeks, 21);
        AccountId twoWeeks = account(true);
        session(twoWeeks, 20);

        assertThat(read(send(threeWeeks, "GET", "/v1/return", null))).containsEntry("suggested", "EASE_BACK");
        assertThat(read(send(twoWeeks, "GET", "/v1/return", null))).containsEntry("suggested", "PICK_UP");
    }

    @Test
    void anAnswerIsKeptAndTheSameGapIsNotAskedAgainButANewOneIs() throws Exception {
        AccountId account = account(true);
        session(account, 30);

        Map<String, Object> answered = read(send(account, "POST", "/v1/return", Map.of("choice", "EASE_BACK")));

        assertThat(answered).containsEntry("shouldPrompt", false).containsEntry("awayDays", 30);
        assertThat(read(send(account, "GET", "/v1/return", null))).containsEntry("shouldPrompt", false);
        assertThat(jdbc.sql("select choice from training.return_answer where account_id = :a").param("a", account.value()).query(String.class).single())
                .isEqualTo("EASE_BACK");
        // Changed her mind in the same gap: the newer answer is the one kept.
        assertThat(send(account, "POST", "/v1/return", Map.of("choice", "REBUILD"))).hasStatusOk();
        assertThat(jdbc.sql("select choice from training.return_answer where account_id = :a").param("a", account.value()).query(String.class).single())
                .isEqualTo("REBUILD");
        // A log since (on her calendar eight days ago) and a gap of eight days from it: asked again.
        weighIn(account, 8);
        assertThat(read(send(account, "GET", "/v1/return", null))).containsEntry("awayDays", 8).containsEntry("shouldPrompt", true);
        // A log today ends the gap altogether.
        weighIn(account, 0);
        assertThat(read(send(account, "GET", "/v1/return", null))).containsEntry("awayDays", 0).containsEntry("shouldPrompt", false);
    }

    @Test
    void aChoiceIsRequiredAndOnlyTheThreeAreTaken() throws Exception {
        AccountId account = account(true);
        session(account, 30);

        assertThat(send(account, "POST", "/v1/return", Map.of())).hasStatus(400);
        assertThat(send(account, "POST", "/v1/return", Map.of("choice", "GIVE_UP"))).hasStatus(400);
        assertThat(jdbc.sql("select count(*) from training.return_answer where account_id = :a").param("a", account.value()).query(Integer.class).single())
                .isZero();
    }

    @Test
    void pickingUpKeepsTheProgramsTargetsAsTheyWereAndEasingBackLeavesTheStepBack() throws Exception {
        BigDecimal step = BigDecimal.valueOf(parameters.forSex(Sex.MALE).number(ParameterKey.LOAD_INCREMENT_UPPER_KG));
        AccountId picks = withAProgramDoneAMonthAgo();
        AccountId eases = withAProgramDoneAMonthAgo();
        assertThat(kg(planned(picks).get("nextLoadKg"))).as("a month away: a step lighter").isEqualByComparingTo(new BigDecimal("60").subtract(step));
        assertThat(program(picks)).containsEntry("backAfterBreak", true);

        assertThat(send(picks, "POST", "/v1/return", Map.of("choice", "PICK_UP"))).hasStatusOk();
        assertThat(send(eases, "POST", "/v1/return", Map.of("choice", "EASE_BACK"))).hasStatusOk();

        assertThat(kg(planned(picks).get("nextLoadKg"))).as("picked up: the usual next load").isEqualByComparingTo(new BigDecimal("60").add(step));
        assertThat(program(picks)).doesNotContainKey("backAfterBreak");
        assertThat(kg(planned(eases).get("nextLoadKg"))).isEqualByComparingTo(new BigDecimal("60").subtract(step));
        assertThat(program(eases)).containsEntry("backAfterBreak", true);
    }

    @Test
    void rebuildingChangesNoTargetOfTheProgram() throws Exception {
        BigDecimal step = BigDecimal.valueOf(parameters.forSex(Sex.MALE).number(ParameterKey.LOAD_INCREMENT_UPPER_KG));
        AccountId account = withAProgramDoneAMonthAgo();
        Object programId = program(account).get("id");

        assertThat(send(account, "POST", "/v1/return", Map.of("choice", "REBUILD"))).hasStatusOk();

        assertThat(program(account).get("id")).isEqualTo(programId);
        assertThat(kg(planned(account).get("nextLoadKg"))).isEqualByComparingTo(new BigDecimal("60").subtract(step));
    }

    @Test
    void aPickUpEndsWithTheNextSessionAndTheNextLongBreakIsEasedAgain() throws Exception {
        BigDecimal step = BigDecimal.valueOf(parameters.forSex(Sex.MALE).number(ParameterKey.LOAD_INCREMENT_UPPER_KG));
        AccountId account = withAProgramDoneAMonthAgo();
        assertThat(send(account, "POST", "/v1/return", Map.of("choice", "PICK_UP"))).hasStatusOk();
        assertThat(program(account)).doesNotContainKey("backAfterBreak");
        // A session after the gap the answer was for (25 days ago, 62.5 at the top again), and none since: the answer was for the
        // gap before it. Three weeks and more on from it, that break is eased as any other.
        String back = start(account, clock.instant().minus(Duration.ofDays(25)));
        set(account, back, 62.5, 10);
        assertThat(send(account, "POST", "/v1/workouts/" + back + "/finish",
                Map.of("endedAt", clock.instant().toString(), "uncleanExerciseIds", List.of()))).hasStatusOk();

        assertThat(program(account)).containsEntry("backAfterBreak", true);
        assertThat(kg(planned(account).get("nextLoadKg"))).isEqualByComparingTo(new BigDecimal("62.5").subtract(step));
    }

    @Test
    void theNextCallIsTheFirstCallsDayThenTodayWhileThisWeeksIsOpenAndTheNextCheckInDayOnceMade() throws Exception {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        AccountId account = account(true);
        session(account, 10);

        assertThat(read(send(account, "GET", "/v1/return", null))).containsEntry("nextCallOn", today.plusWeeks(1).toString());
        // Finished a week ago: the first call's day has come, and its check-in is open today.
        jdbc.sql("update profile.profile set onboarded_at = now() - make_interval(hours => 168) where account_id = :a").param("a", account.value()).update();
        assertThat(read(send(account, "GET", "/v1/return", null))).containsEntry("nextCallOn", today.toString());
        // Made this week: the next one is the check-in day a week on (the check-in day is today's weekday here).
        assertThat(send(account, "POST", "/v1/check-ins/current/answers",
                Map.of("clientId", UUID.randomUUID(), "weekOf", today.toString(), "answers", List.of()))).hasStatusOk();
        assertThat(read(send(account, "GET", "/v1/return", null))).containsEntry("nextCallOn", today.plusWeeks(1).toString());
    }

    @Test
    void withoutAProfileThereIsNoCalendar() {
        AccountId account = TestSessions.newAccount();

        assertThat(send(account, "GET", "/v1/return", null)).hasStatus(409);
        assertThat(send(account, "POST", "/v1/return", Map.of("choice", "PICK_UP"))).hasStatus(409);
    }

    @Test
    void itNeedsASignedInUser() {
        assertThat(mvc.get().uri("/v1/return").exchange()).hasStatus(401);
        assertThat(mvc.post().uri("/v1/return").contentType(MediaType.APPLICATION_JSON).content("{\"choice\":\"PICK_UP\"}").exchange()).hasStatus(401);
    }

    /** A man in UTC checking in on today's weekday, with the health data consent or without it. */
    private AccountId account(boolean healthData) {
        AccountId account = TestSessions.newAccount();
        if (healthData) {
            assertThat(send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA))).hasStatusOk();
        }
        assertThat(send(account, "PUT", "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", LocalDate.now(ZoneOffset.UTC).getDayOfWeek().name(), "timeZone", "UTC"))))
                .hasStatusOk();
        return account;
    }

    /** A session of one working set, started this many days ago. */
    private String session(AccountId account, int daysAgo) throws Exception {
        String workout = start(account, clock.instant().minus(Duration.ofDays(daysAgo)), null);
        set(account, workout, 60, 10);
        return workout;
    }

    private String start(AccountId account, Instant at) throws Exception {
        return start(account, at, programDayId(account));
    }

    private String start(AccountId account, Instant at, Object programDayId) throws Exception {
        Map<String, Object> body = new java.util.HashMap<>(Map.of("clientId", UUID.randomUUID(), "startedAt", at.toString()));
        if (programDayId != null) {
            body.put("programDayId", programDayId);
        }
        MvcTestResult started = send(account, "POST", "/v1/workouts", body);
        assertThat(started).hasStatus(201);
        return (String) read(started, 201).get("id");
    }

    private void set(AccountId account, String workout, double kg, int reps) {
        for (int i = 0; i < 3; i++) {
            assertThat(send(account, "POST", "/v1/workouts/" + workout + "/sets", Map.of("clientId", UUID.randomUUID(), "exerciseId", "bench_press",
                    "setType", "WORKING", "loadKg", kg, "reps", reps, "rir", 1, "side", "BOTH"))).hasStatus(201);
        }
    }

    private void cardio(AccountId account, int daysAgo) {
        assertThat(send(account, "POST", "/v1/cardio-sessions", Map.of("clientId", UUID.randomUUID(),
                "day", LocalDate.now(ZoneOffset.UTC).minusDays(daysAgo).toString(), "minutes", 30, "source", "MANUAL"))).hasStatusOk();
    }

    private void weighIn(AccountId account, int daysAgo) {
        assertThat(send(account, "POST", "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(),
                "measuredAt", clock.instant().minus(Duration.ofDays(daysAgo)).toString(), "kg", 82.4, "source", "MANUAL"))).hasStatusOk();
    }

    private void meal(AccountId account, int daysAgo) {
        jdbc.sql("""
                insert into nutrition.food (id, name, source, kcal, protein_g, carbs_g, fat_g)
                values ('fdc:171477', 'Chicken breast, roasted', 'FOUNDATION', 165, 31, 0, 3.6) on conflict (id) do nothing""").update();
        assertThat(send(account, "POST", "/v1/meals", Map.of("clientId", UUID.randomUUID(),
                "eatenAt", clock.instant().minus(Duration.ofDays(daysAgo)).toString(), "slot", "LUNCH",
                "items", List.of(Map.of("foodId", "fdc:171477", "amount", Map.of("quantity", 200, "unit", "g")))))).hasStatusOk();
    }

    /** Own program, one day with bench 6-10 first; one session of it 30 days ago, every set at the top: its next load is 60 plus a step. */
    private AccountId withAProgramDoneAMonthAgo() throws Exception {
        AccountId account = account(true);
        assertThat(send(account, "PUT", "/v1/program", Map.of("days", List.of(Map.of("name", "Upper", "weekday", "MONDAY", "exercises", List.of(
                Map.of("exerciseId", "bench_press", "sets", 3, "reps", Map.of("min", 6, "max", 10)))))))).hasStatusOk();
        String workout = start(account, clock.instant().minus(Duration.ofDays(30)));
        set(account, workout, 60, 10);
        assertThat(send(account, "POST", "/v1/workouts/" + workout + "/finish",
                Map.of("endedAt", clock.instant().toString(), "uncleanExerciseIds", List.of()))).hasStatusOk();
        return account;
    }

    private Map<String, Object> program(AccountId account) throws Exception {
        return read(send(account, "GET", "/v1/program", null));
    }

    @SuppressWarnings("unchecked")
    private Object programDayId(AccountId account) throws Exception {
        return ((List<Map<String, Object>>) program(account).get("days")).getFirst().get("id");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> planned(AccountId account) throws Exception {
        Map<String, Object> day = ((List<Map<String, Object>>) program(account).get("days")).getFirst();
        return ((List<Map<String, Object>>) day.get("exercises")).getFirst();
    }

    private static BigDecimal kg(Object kg) {
        return new BigDecimal(kg.toString());
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> read(MvcTestResult result) throws Exception {
        return read(result, 200);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> read(MvcTestResult result, int status) throws Exception {
        assertThat(result).hasStatus(status);
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
