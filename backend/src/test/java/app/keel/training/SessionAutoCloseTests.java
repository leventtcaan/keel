package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.ParameterKey;
import app.keel.engine.ParameterSet;
import app.keel.engine.Sex;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.json.JsonMapper;

/**
 * "Fill in the rest later" (ADR-075 #5): a session left without a finish stays open, and after
 * unfinished_session_close_hours (data/parameters/workout.json) it closes by itself — its targets set as a finish sets
 * them (K-217). The end it gets is its start: sets carry no times, so no later end is known, and a session hours long
 * would be one the user never trained (the import's rule for an end not given, K-615). The time comes in as an argument;
 * the scheduler is off in the tests (keel.training.session-auto-close: "-"). One day, own program: bench 3 × 6-10.
 *
 * <p>closeDue closes every due session of the database these tests share, other classes' leftovers too: each test
 * asserts only on the accounts it made. A set logged while a close is under way never misses it (WorkoutStore.findForWrite):
 * the two races are forced with a held transaction, and the waiting side is seen in pg_stat_activity.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class SessionAutoCloseTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    // Two days ago, not a fixed date: a session three weeks old would be a break the program steps back from (K-531).
    // Whole seconds, as the stored time reads back.
    private static final Instant STARTED = Instant.now().truncatedTo(ChronoUnit.SECONDS).minus(Duration.ofDays(2));
    private static final Duration OPEN_FOR = SessionAutoClose.closeAfterFromClasspath();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    ParameterSet parameters;

    @Autowired
    SessionAutoClose autoClose;

    @Autowired
    WorkoutStore store;

    @Autowired
    SessionProgress progress;

    @Autowired
    PlatformTransactionManager transactions;

    @Autowired
    JdbcClient jdbc;

    @Test
    void anUnfinishedSessionClosesAfterTheHoursAndItsTargetsAreSetAsAFinishSetsThem() throws Exception {
        AccountId account = withAProgram();
        String workout = start(account, STARTED);
        sets(account, workout, 60, 10);

        autoClose.closeDue(STARTED.plus(OPEN_FOR));

        assertThat(workout(account, workout)).containsEntry("endedAt", STARTED.toString());
        // Every planned set at the top: the upper body's step, from the bottom of the range — as SessionProgressApiTests' finish.
        assertThat(next(account)).isEqualTo(List.of(kg(new BigDecimal("60").add(step())), 6));
    }

    @Test
    void notBeforeTheHoursArePast() throws Exception {
        AccountId account = withAProgram();
        String workout = start(account, STARTED);
        sets(account, workout, 60, 10);

        autoClose.closeDue(STARTED.plus(OPEN_FOR).minusSeconds(1));

        assertThat(workout(account, workout)).doesNotContainKey("endedAt");
        assertThat(planned(account)).doesNotContainKeys("nextLoadKg", "nextReps");
    }

    @Test
    void aSessionTheUserFinishedMeanwhileStaysAsTheyFinishedIt() throws Exception {
        // The user's finish holds the bench for form (G6 K-31) and says when it ended; the close changes neither.
        AccountId account = withAProgram();
        String workout = start(account, STARTED);
        sets(account, workout, 60, 10);
        Instant ended = STARTED.plus(Duration.ofMinutes(55));
        assertThat(send("POST", account, "/v1/workouts/" + workout + "/finish", Map.of("endedAt", ended.toString(),
                "uncleanExerciseIds", List.of("bench_press"), "note", "elbow"))).hasStatusOk();

        autoClose.closeDue(STARTED.plus(OPEN_FOR));

        assertThat(workout(account, workout)).containsEntry("endedAt", ended.toString()).containsEntry("note", "elbow");
        assertThat(next(account)).isEqualTo(List.of(kg(60), 10));
    }

    @Test
    void eachSessionClosesOnItsOwnAccountsProgram() throws Exception {
        // Two accounts, both due: each target comes from its own sets, onto its own program.
        AccountId light = withAProgram();
        sets(light, start(light, STARTED), 60, 10);
        AccountId heavy = withAProgram();
        sets(heavy, start(heavy, STARTED.plusSeconds(60)), 80, 8);
        AccountId later = withAProgram();
        String notDue = start(later, STARTED.plus(OPEN_FOR));
        sets(later, notDue, 70, 10);

        autoClose.closeDue(STARTED.plus(OPEN_FOR).plusSeconds(60));

        assertThat(next(light)).isEqualTo(List.of(kg(new BigDecimal("60").add(step())), 6));
        assertThat(next(heavy)).isEqualTo(List.of(kg(80), 9));
        assertThat(workout(later, notDue)).doesNotContainKey("endedAt");
        assertThat(planned(later)).doesNotContainKeys("nextLoadKg", "nextReps");
    }

    @Test
    void closingAgainChangesNothingAndSetsFilledInAfterTheCloseStillCount() throws Exception {
        // Filled in later than the close: the session is finished, so a set added derives its targets again (K-432).
        AccountId account = withAProgram();
        String workout = start(account, STARTED);
        sets(account, workout, 60, 10);
        set(account, workout, 60, 9);
        autoClose.closeDue(STARTED.plus(OPEN_FOR));
        assertThat(next(account)).isEqualTo(List.of(kg(60), 10));

        autoClose.closeDue(STARTED.plus(OPEN_FOR).plus(OPEN_FOR));

        assertThat(workout(account, workout)).containsEntry("endedAt", STARTED.toString());
        assertThat(next(account)).isEqualTo(List.of(kg(60), 10));

        String last = setIds(account, workout).getLast();
        assertThat(send("DELETE", account, "/v1/workouts/" + workout + "/sets/" + last, null)).hasStatus(204);
        set(account, workout, 60, 10);

        assertThat(next(account)).isEqualTo(List.of(kg(new BigDecimal("60").add(step())), 6));
    }

    @Test
    void aSetLoggedWhileTheCloseIsUnderWayWaitsForItAndCountsForTheTarget() throws Exception {
        // The close has ended the session and set its target from two sets, not yet committed. The third set's request
        // waits for it, then sees a finished session and derives the target again: all three planned sets at the top.
        AccountId account = withAProgram();
        String workout = start(account, STARTED);
        set(account, workout, 60, 10);
        set(account, workout, 60, 10);
        WorkoutStore.Workout open = store.find(account, UUID.fromString(workout)).orElseThrow();
        CountDownLatch closed = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CompletableFuture<Void> closing = CompletableFuture.runAsync(() -> new TransactionTemplate(transactions).executeWithoutResult(status -> {
            progress.closeUnfinished(account, open, open.startedAt());
            closed.countDown();
            await(release);
        }));
        assertThat(closed.await(10, TimeUnit.SECONDS)).isTrue();

        CompletableFuture<Void> logging = CompletableFuture.runAsync(() -> set(account, workout, 60, 10));
        awaitBlocked(logging);
        release.countDown();
        closing.join();
        logging.join();

        assertThat(next(account)).isEqualTo(List.of(kg(new BigDecimal("60").add(step())), 6));
    }

    @Test
    void aCloseWhileASetIsBeingLoggedWaitsForItAndCountsTheSet() throws Exception {
        // The set's request holds the session, as WorkoutController.log does, and has written the third set, not yet
        // committed. The close waits for it, then sets the target from all three.
        AccountId account = withAProgram();
        String workout = start(account, STARTED);
        set(account, workout, 60, 10);
        set(account, workout, 60, 10);
        UUID id = UUID.fromString(workout);
        CountDownLatch logged = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CompletableFuture<Void> logging = CompletableFuture.runAsync(() -> new TransactionTemplate(transactions).executeWithoutResult(status -> {
            store.findForWrite(account, id).orElseThrow();
            store.log(account, id, new WorkoutStore.LoggedSet(null, UUID.randomUUID(), "bench_press", SetType.WORKING, new BigDecimal("60"), 10,
                    1, Side.BOTH, null, id, null));
            logged.countDown();
            await(release);
        }));
        assertThat(logged.await(10, TimeUnit.SECONDS)).isTrue();
        WorkoutStore.Workout open = store.find(account, id).orElseThrow();

        CompletableFuture<Void> closing = CompletableFuture.runAsync(() -> progress.closeUnfinished(account, open, open.startedAt()));
        awaitBlocked(closing);
        release.countDown();
        logging.join();
        closing.join();

        assertThat(workout(account, workout)).containsEntry("endedAt", STARTED.toString());
        assertThat(next(account)).isEqualTo(List.of(kg(new BigDecimal("60").add(step())), 6));
    }

    /** Until the other side waits on a lock, or is done without waiting (the race lost); at most 10 s. */
    private void awaitBlocked(CompletableFuture<?> other) throws InterruptedException {
        for (int i = 0; i < 100 && !other.isDone(); i++) {
            if (jdbc.sql("select count(*) from pg_stat_activity where wait_event_type = 'Lock' and datname = current_database()")
                    .query(Long.class).single() > 0) {
                return;
            }
            Thread.sleep(100);
        }
    }

    private static void await(CountDownLatch latch) {
        try {
            assertThat(latch.await(10, TimeUnit.SECONDS)).isTrue();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
    }

    private AccountId withAProgram() {
        AccountId account = TestSessions.newAccount();
        send("PUT", account, "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")));
        assertThat(send("PUT", account, "/v1/program", Map.of("days", List.of(Map.of("name", "Full body", "weekday", "MONDAY", "exercises",
                List.of(Map.of("exerciseId", "bench_press", "sets", 3, "reps", Map.of("min", 6, "max", 10)))))))).hasStatusOk();
        return account;
    }

    @SuppressWarnings("unchecked")
    private String start(AccountId account, Instant at) throws Exception {
        Map<String, Object> day = ((List<Map<String, Object>>) map(send("GET", account, "/v1/program", null)).get("days")).getFirst();
        MvcTestResult started = send("POST", account, "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", at.toString(),
                "programDayId", day.get("id")));
        assertThat(started).hasStatus(201);
        return (String) map(started).get("id");
    }

    /** Three bench sets of this load and reps, one rep in reserve. */
    private void sets(AccountId account, String workout, double kg, int reps) {
        for (int i = 0; i < 3; i++) {
            set(account, workout, kg, reps);
        }
    }

    private void set(AccountId account, String workout, double kg, int reps) {
        Map<String, Object> body = new HashMap<>(Map.of("clientId", UUID.randomUUID(), "exerciseId", "bench_press", "setType", "WORKING",
                "loadKg", kg, "reps", reps, "rir", 1, "side", "BOTH"));
        assertThat(send("POST", account, "/v1/workouts/" + workout + "/sets", body)).hasStatus(201);
    }

    private Map<String, Object> workout(AccountId account, String workout) throws Exception {
        return map(send("GET", account, "/v1/workouts/" + workout, null));
    }

    @SuppressWarnings("unchecked")
    private List<String> setIds(AccountId account, String workout) throws Exception {
        return ((List<Map<String, Object>>) workout(account, workout).get("sets")).stream().map(set -> (String) set.get("id")).toList();
    }

    /** The day's bench as the program shows it today. */
    @SuppressWarnings("unchecked")
    private Map<String, Object> planned(AccountId account) throws Exception {
        Map<String, Object> day = ((List<Map<String, Object>>) map(send("GET", account, "/v1/program", null)).get("days")).getFirst();
        return ((List<Map<String, Object>>) day.get("exercises")).getFirst();
    }

    /** The bench's next load (plain, 62.5 not 62.50) and reps. */
    private List<Object> next(AccountId account) throws Exception {
        Map<String, Object> planned = planned(account);
        assertThat(planned).containsKeys("nextLoadKg", "nextReps");
        return List.of(kg(planned.get("nextLoadKg")), planned.get("nextReps"));
    }

    /** The upper body's load step, from the parameter file. */
    private BigDecimal step() {
        return BigDecimal.valueOf(parameters.forSex(Sex.MALE).number(ParameterKey.LOAD_INCREMENT_UPPER_KG));
    }

    private static BigDecimal kg(Object kg) {
        return new BigDecimal(kg.toString()).stripTrailingZeros();
    }

    private MvcTestResult send(String method, AccountId account, String uri, Object body) {
        var request = switch (method) {
            case "GET" -> mvc.get();
            case "PUT" -> mvc.put();
            case "DELETE" -> mvc.delete();
            default -> mvc.post();
        };
        request = request.uri(uri).header("Authorization", TestSessions.bearer(context, account));
        if (body != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(body));
        }
        return request.exchange();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(MvcTestResult result) throws Exception {
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }
}
