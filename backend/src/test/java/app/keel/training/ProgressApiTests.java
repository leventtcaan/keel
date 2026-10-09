package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
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
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * The end-of-workout and progress summaries over the API (K-965): two sessions of one program day a week apart — bench
 * 3 × 6-10, squat 3 × 6-10, curl 3 × 8-12 — the second with a bench record, a squat tie that was easier, and the curl's
 * first sets. A heavy warm-up in the first is never a set to beat. Then: one-sided sets counted once, a summary's week as
 * it stood, a week off, "stuck" in the weekly call's window, and the change against the same program day.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class ProgressApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    Clock clock;

    @Autowired
    TrainingCalls calls;

    @Autowired
    JdbcClient jdbc;

    @Autowired
    SessionProgress progress;

    @Autowired
    WorkoutStore workouts;

    @Test
    @SuppressWarnings("unchecked")
    void theWorkoutsSummaryHasItsRecordsBaselinesWeightLiftedAndMuscles() throws Exception {
        AccountId account = withAProgram();
        Instant now = clock.instant();
        String first = start(account, now.minus(Duration.ofDays(9)));
        sets(account, first, "bench_press", 1, 100, 20, 2, "WARM_UP");
        sets(account, first, "bench_press", 3, 60, 8, 1, "WORKING");
        sets(account, first, "squat", 3, 100, 8, 1, "WORKING");
        String second = start(account, now.minus(Duration.ofDays(2)));
        sets(account, second, "bench_press", 2, 60, 9, 1, "WORKING");
        sets(account, second, "bench_press", 1, 62.5, 6, 1, "WORKING");
        sets(account, second, "squat", 3, 100, 8, 2, "WORKING");
        sets(account, second, "barbell_curl", 2, 30, 10, 1, "WORKING");

        Map<String, Object> summary = map(send("GET", account, "/v1/workouts/" + second + "/summary"));

        // 2 × 540 + 375 + 3 × 800 + 2 × 300 = 4455 kg against 3 × 480 + 3 × 800 = 3840: +16%.
        assertThat(((Number) summary.get("liftedKg")).doubleValue()).isEqualTo(4455.0);
        assertThat(summary.get("liftedChangePercent")).isEqualTo(16);
        assertThat(summary.get("workingSets")).isEqualTo(8);
        // No earlier bench set dominates 60 × 9 or 62.5 × 6 (the 100 × 20 warm-up is none, or neither would be); the second
        // 60 × 9 ties the first; the heaviest record is the session's. The squat ties.
        assertThat((List<Map<String, Object>>) summary.get("marks")).containsExactly(
                Map.of("exerciseId", "bench_press", "kind", "RECORD", "loadKg", 62.5, "reps", 6, "rir", 1),
                Map.of("exerciseId", "barbell_curl", "kind", "BASELINE", "loadKg", 30, "reps", 10, "rir", 1));
        List<Map<String, Object>> muscles = (List<Map<String, Object>>) summary.get("muscles");
        assertThat(muscles).extracting(muscle -> muscle.get("muscle")).containsExactly("biceps", "chest", "quads");
        assertThat(muscles.getFirst()).containsEntry("plannedSets", 3).containsEntry("doneSets", 2).containsEntry("targetSets", 6);
        assertThat(((Number) muscles.get(1).get("doneShare")).doubleValue()).isEqualTo(0.3);

        // What moved (K-1008), against the same day's last session: the bench's best is 62.5 × 6 after 60 × 8 (a load up);
        // the squat the same; the curl was not in it. In the order first done.
        assertThat((List<Map<String, Object>>) summary.get("moves")).containsExactly(
                Map.of("exerciseId", "bench_press", "best", Map.of("loadKg", 62.5, "reps", 6), "change", "LOAD", "by", 2.5),
                Map.of("exerciseId", "squat", "best", Map.of("loadKg", 100, "reps", 8), "change", "SAME"),
                Map.of("exerciseId", "barbell_curl", "best", Map.of("loadKg", 30, "reps", 10), "change", "FIRST"));

        Map<String, Object> firstSummary = map(send("GET", account, "/v1/workouts/" + first + "/summary"));
        assertThat(firstSummary).doesNotContainKey("liftedChangePercent");
        assertThat((List<Map<String, Object>>) firstSummary.get("moves")).extracting(move -> move.get("change")).containsExactly("FIRST", "FIRST");
        assertThat((List<Map<String, Object>>) firstSummary.get("marks")).extracting(mark -> mark.get("kind")).containsExactly("BASELINE", "BASELINE");

        assertThat(send("GET", TestSessions.newAccount(), "/v1/workouts/" + second + "/summary")).hasStatus(404);
    }


    @Test
    @SuppressWarnings("unchecked")
    void whatMovedIsHeldOnlyForACompoundMoveWhileTheCallHoldsTheLoad() throws Exception {
        AccountId account = withAProgram();
        Instant now = clock.instant();
        String before = start(account, now.minus(Duration.ofDays(7)));
        sets(account, before, "bench_press", 3, 80, 8, 1, "WORKING");
        sets(account, before, "barbell_curl", 2, 30, 10, 1, "WORKING");
        assertThat(calls.holdLoad(account, UUID.randomUUID(), LocalDate.now(clock.withZone(ZoneOffset.UTC)).minusDays(3))).isTrue();
        String today = start(account, now.minus(Duration.ofHours(1)));
        sets(account, today, "bench_press", 3, 80, 8, 1, "WORKING");
        sets(account, today, "barbell_curl", 2, 30, 10, 1, "WORKING");

        assertThat((List<Map<String, Object>>) map(send("GET", account, "/v1/workouts/" + today + "/summary")).get("moves"))
                .extracting(move -> move.get("change")).containsExactly("HELD", "SAME");
    }

    @Test
    @SuppressWarnings("unchecked")
    void whatMovedComparesWithTheNewestEarlierSessionOfTheDayNotTheHeaviest() throws Exception {
        AccountId account = withAProgram();
        Instant now = clock.instant();
        String heavy = start(account, now.minus(Duration.ofDays(9)));
        sets(account, heavy, "bench_press", 3, 90, 6, 1, "WORKING");
        String newest = start(account, now.minus(Duration.ofDays(5)));
        sets(account, newest, "bench_press", 3, 80, 8, 1, "WORKING");
        String today = start(account, now.minus(Duration.ofHours(1)));
        sets(account, today, "bench_press", 3, 80, 9, 1, "WORKING");

        assertThat((List<Map<String, Object>>) map(send("GET", account, "/v1/workouts/" + today + "/summary")).get("moves")).containsExactly(
                Map.of("exerciseId", "bench_press", "best", Map.of("loadKg", 80, "reps", 9), "change", "REPS", "by", 1));
    }

    @Test
    @SuppressWarnings("unchecked")
    void aSessionOfAnotherDayOrOffTheProgramIsNotTheDaysLastButAMoveNotInTheDaysLastHasItsOwn() throws Exception {
        AccountId account = withTwoDays();
        Instant now = clock.instant();
        String monday = start(account, now.minus(Duration.ofDays(7)), 0);
        sets(account, monday, "bench_press", 3, 80, 8, 1, "WORKING");
        // Another day's session and one off the program, both later: neither is the Monday's last session.
        String thursday = start(account, now.minus(Duration.ofDays(4)), 1);
        sets(account, thursday, "bench_press", 3, 70, 10, 1, "WORKING");
        sets(account, thursday, "squat", 3, 100, 8, 1, "WORKING");
        String off = startOff(account, now.minus(Duration.ofDays(2)));
        sets(account, off, "bench_press", 3, 60, 12, 1, "WORKING");
        sets(account, off, "squat", 3, 105, 6, 1, "WORKING");
        String today = start(account, now.minus(Duration.ofHours(1)), 0);
        sets(account, today, "bench_press", 3, 80, 9, 1, "WORKING");
        // Swapped in today: the squat was not in the Monday's last session; its own last is the session off the program.
        sets(account, today, "squat", 3, 105, 7, 1, "WORKING");

        Map<String, Object> summary = map(send("GET", account, "/v1/workouts/" + today + "/summary"));
        assertThat((List<Map<String, Object>>) summary.get("moves")).containsExactly(
                Map.of("exerciseId", "bench_press", "best", Map.of("loadKg", 80, "reps", 9), "change", "REPS", "by", 1),
                Map.of("exerciseId", "squat", "best", Map.of("loadKg", 105, "reps", 7), "change", "REPS", "by", 1));
        // The percent is the same day's: 3 × 720 + 3 × 735 against 3 × 640.
        assertThat(summary.get("liftedChangePercent")).isEqualTo(127);
    }

    @Test
    @SuppressWarnings("unchecked")
    void aDiscardedSessionAndOneOfSkippedSetsOnlyAreNoLastSession() throws Exception {
        AccountId account = withAProgram();
        Instant now = clock.instant();
        String real = start(account, now.minus(Duration.ofDays(9)));
        sets(account, real, "bench_press", 3, 80, 8, 1, "WORKING");
        String discarded = start(account, now.minus(Duration.ofDays(6)));
        sets(account, discarded, "bench_press", 3, 100, 8, 1, "WORKING");
        assertThat(send("DELETE", account, "/v1/workouts/" + discarded)).hasStatus(204);
        String skipped = start(account, now.minus(Duration.ofDays(3)));
        sets(account, skipped, "bench_press", 3, 80, 0, 0, "WORKING");
        String today = start(account, now.minus(Duration.ofHours(1)));
        sets(account, today, "bench_press", 3, 82.5, 8, 1, "WORKING");

        Map<String, Object> summary = map(send("GET", account, "/v1/workouts/" + today + "/summary"));
        assertThat((List<Map<String, Object>>) summary.get("moves")).extracting(move -> move.get("change"), move -> move.get("by"))
                .containsExactly(tuple("LOAD", 2.5));
        // 3 × 660 against 3 × 640: the skipped-only session is not the one compared with.
        assertThat(summary.get("liftedChangePercent")).isEqualTo(3);
    }

    @Test
    void aSummarysMinutesAreTheSessionsActiveTimeAndNoneWhileItIsOpen() throws Exception {
        // K-998: the time paused is not the session's (ADR-075 #5, user test C14).
        AccountId account = withAProgram();
        Instant at = clock.instant().minus(Duration.ofDays(2));
        String workout = start(account, at);
        sets(account, workout, "bench_press", 1, 60, 8, 1, "WORKING");
        assertThat(map(send("GET", account, "/v1/workouts/" + workout + "/summary"))).doesNotContainKey("minutes");

        assertThat(send("POST", account, "/v1/workouts/" + workout + "/finish",
                Map.of("endedAt", at.plus(Duration.ofMinutes(55)).toString(), "pausedSeconds", 300))).hasStatusOk();

        assertThat(map(send("GET", account, "/v1/workouts/" + workout + "/summary"))).containsEntry("minutes", 50);
    }

    @Test
    void aSessionClosedByItselfHasNoMinutesItsLengthIsNotKnown() throws Exception {
        // #509 review: closed by the server (endedAt = startedAt, K-961), it lasted no 0 minutes; the time is not known.
        AccountId account = withAProgram();
        Instant at = clock.instant().minus(Duration.ofDays(2));
        String workout = start(account, at);
        sets(account, workout, "bench_press", 1, 60, 8, 1, "WORKING");
        progress.closeUnfinished(account, workouts.find(account, UUID.fromString(workout)).orElseThrow(), at);

        assertThat(map(send("GET", account, "/v1/workouts/" + workout + "/summary"))).doesNotContainKey("minutes");
    }

    @Test
    @SuppressWarnings("unchecked")
    void progressHasEachProgramMoveWithItsBaselineBestEffortAndTheLiftsStronger() throws Exception {
        AccountId account = withAProgram();
        Instant now = clock.instant();
        String first = start(account, now.minus(Duration.ofDays(9)));
        sets(account, first, "bench_press", 3, 60, 8, 1, "WORKING");
        sets(account, first, "squat", 3, 100, 8, 1, "WORKING");
        String second = start(account, now.minus(Duration.ofDays(2)));
        sets(account, second, "bench_press", 3, 60, 9, 1, "WORKING");
        sets(account, second, "squat", 3, 100, 8, 2, "WORKING");

        Map<String, Object> progress = map(send("GET", account, "/v1/training-progress"));

        assertThat(progress).containsEntry("strongerLifts", 1).containsEntry("trackedLifts", 2);
        List<Map<String, Object>> lifts = (List<Map<String, Object>>) progress.get("lifts");
        assertThat(lifts).extracting(lift -> lift.get("exerciseId")).containsExactly("bench_press", "squat");
        assertThat(lifts.getFirst()).containsEntry("stronger", true);
        assertThat((Map<String, Object>) lifts.getFirst().get("best")).containsEntry("reps", 9);
        assertThat((Map<String, Object>) lifts.getFirst().get("baseline")).containsEntry("reps", 8);
        assertThat((List<Object>) lifts.getFirst().get("weeks")).hasSize(2);
        // The squat: the same 100 × 8, now with 2 left.
        assertThat(lifts.get(1)).containsEntry("stronger", false);
        assertThat((Map<String, Object>) lifts.get(1).get("effort")).containsEntry("kind", "EASIER").containsEntry("repsLeft", 2)
                .containsEntry("repsLeftBefore", 1).containsEntry("reps", 8);
        // Planned from the program whatever the day; the curl is planned though not yet done.
        assertThat((List<Map<String, Object>>) progress.get("muscles")).filteredOn(muscle -> "biceps".equals(muscle.get("muscle")))
                .singleElement().satisfies(biceps -> assertThat(biceps).containsEntry("plannedSets", 3));
    }

    @Test
    @SuppressWarnings("unchecked")
    void aOneSidedMovesSetsCountOnceAsTheSideThatDidLessInBothSummaries() throws Exception {
        AccountId account = withAProgram(own("one_arm_dumbbell_row", 8, 12));
        String workout = start(account, thisMonday().plus(Duration.ofMinutes(1)));
        for (String side : List.of("LEFT", "RIGHT", "LEFT", "RIGHT", "LEFT", "RIGHT", "LEFT")) {
            set(account, workout, "one_arm_dumbbell_row", 30, 10, 1, "WORKING", side);
        }

        Map<String, Object> summary = map(send("GET", account, "/v1/workouts/" + workout + "/summary"));
        Map<String, Object> progress = map(send("GET", account, "/v1/training-progress"));

        // Four on the left, three on the right: three sets, as the program's 3 sets (per side) count them.
        assertThat(summary).containsEntry("workingSets", 3);
        for (Map<String, Object> view : List.of(summary, progress)) {
            assertThat((List<Map<String, Object>>) view.get("muscles")).filteredOn(muscle -> "upper_back".equals(muscle.get("muscle")))
                    .singleElement().satisfies(back -> assertThat(back).containsEntry("plannedSets", 3).containsEntry("doneSets", 3));
        }
    }

    @Test
    @SuppressWarnings("unchecked")
    void aWorkoutsMuscleWeekIsTheWeekAsItStoodWhenItStarted() throws Exception {
        AccountId account = withAProgram();
        String first = start(account, thisMonday().plus(Duration.ofMinutes(1)));
        sets(account, first, "bench_press", 3, 60, 8, 1, "WORKING");
        String second = start(account, thisMonday().plus(Duration.ofMinutes(2)));
        sets(account, second, "bench_press", 3, 60, 8, 1, "WORKING");

        assertThat((List<Map<String, Object>>) map(send("GET", account, "/v1/workouts/" + first + "/summary")).get("muscles"))
                .singleElement().satisfies(chest -> assertThat(chest).containsEntry("doneSets", 3));
        assertThat((List<Map<String, Object>>) map(send("GET", account, "/v1/workouts/" + second + "/summary")).get("muscles"))
                .singleElement().satisfies(chest -> assertThat(chest).containsEntry("doneSets", 6));
    }

    @Test
    @SuppressWarnings("unchecked")
    void aWeekOffPlansNoSets() throws Exception {
        AccountId account = withAProgram();
        LocalDate today = LocalDate.now(clock.withZone(ZoneOffset.UTC));
        assertThat(calls.restWeek(account, UUID.randomUUID(), today.minusDays(1), today.plusDays(5))).isTrue();

        assertThat((List<Map<String, Object>>) map(send("GET", account, "/v1/training-progress")).get("muscles"))
                .isNotEmpty().allSatisfy(muscle -> assertThat(muscle).containsEntry("plannedSets", 0));
    }

    @Test
    @SuppressWarnings("unchecked")
    void stuckIsTheWeeklyCallsStallNotTheImportedHistorys() throws Exception {
        // Four imported squat sessions at 100 × 8 and one logged: the call's window (logged, since the program) holds one.
        AccountId account = withAProgram();
        backdateProgram(account, Duration.ofDays(30));
        send("PUT", account, "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA));
        Instant now = clock.instant();
        List<Map<String, Object>> imported = new java.util.ArrayList<>();
        for (int daysAgo : new int[] {20, 16, 12, 8}) {
            Instant at = now.minus(Duration.ofDays(daysAgo));
            imported.add(Map.of("clientId", UUID.randomUUID(), "startedAt", at.toString(), "endedAt", at.plus(Duration.ofHours(1)).toString(),
                    "sets", List.of(Map.of("exerciseId", "squat", "setType", "WORKING", "loadKg", 100, "reps", 8))));
        }
        assertThat(send("POST", account, "/v1/workout-imports", Map.of("source", "STRONG", "workouts", imported))).hasStatusOk();
        String logged = start(account, now.minus(Duration.ofDays(2)));
        sets(account, logged, "squat", 3, 100, 8, 1, "WORKING");

        Map<String, Object> squat = lift(account, "squat");

        assertThat(squat).doesNotContainKey("effort");
        // The imported history still draws the chart and sets the baseline.
        assertThat((Map<String, Object>) squat.get("baseline")).containsEntry("reps", 8);
        assertThat((List<Object>) squat.get("weeks")).hasSizeGreaterThan(1);
    }

    @Test
    @SuppressWarnings("unchecked")
    void aProgramMadeAgainStartsTheStallAgain() throws Exception {
        AccountId account = withAProgram();
        backdateProgram(account, Duration.ofDays(30));
        Instant now = clock.instant();
        for (int daysAgo : new int[] {20, 15, 10, 5}) {
            sets(account, start(account, now.minus(Duration.ofDays(daysAgo))), "squat", 3, 100, 8, 1, "WORKING");
        }
        assertThat((Map<String, Object>) lift(account, "squat").get("effort")).containsEntry("kind", "STUCK").containsEntry("sessions", 3);

        send("PUT", account, "/v1/program", program(List.of(own("bench_press", 6, 10), own("squat", 6, 10), own("barbell_curl", 8, 12))));

        assertThat(lift(account, "squat")).doesNotContainKey("effort");
    }

    @Test
    @SuppressWarnings("unchecked")
    void theChangeAgainstTheSameDayOutlivesAReviewButNotANewProgram() throws Exception {
        // The user's own week with 16 chest sets: over weekly_sets_max, a finding the review always makes (K-955).
        AccountId account = withAProgram(Map.of("exerciseId", "bench_press", "sets", 16, "reps", Map.of("min", 6, "max", 10)), own("squat", 6, 10));
        Instant now = clock.instant();
        sets(account, start(account, now.minus(Duration.ofDays(9))), "bench_press", 3, 60, 8, 1, "WORKING");
        Map<String, Object> review = (Map<String, Object>) map(send("GET", account, "/v1/program")).get("review");
        assertThat(((List<Map<String, Object>>) review.get("suggestions")).stream().map(suggestion -> suggestion.get("id")))
                .contains("TOO_MANY_SETS:chest");
        assertThat(send("POST", account, "/v1/program/review/apply", Map.of("reviewId", review.get("id"),
                "suggestionIds", List.of("TOO_MANY_SETS:chest")))).hasStatusOk();

        String afterReview = start(account, now.minus(Duration.ofDays(2)));
        sets(account, afterReview, "bench_press", 3, 60, 9, 1, "WORKING");
        // 1620 kg against 1440: +13%, the review kept the day.
        assertThat(map(send("GET", account, "/v1/workouts/" + afterReview + "/summary"))).containsEntry("liftedChangePercent", 13);

        send("PUT", account, "/v1/program", program(List.of(own("bench_press", 6, 10), own("squat", 6, 10), own("barbell_curl", 8, 12))));
        String afterNewProgram = start(account, now.minus(Duration.ofDays(1)));
        sets(account, afterNewProgram, "bench_press", 3, 60, 9, 1, "WORKING");
        assertThat(map(send("GET", account, "/v1/workouts/" + afterNewProgram + "/summary"))).doesNotContainKey("liftedChangePercent");
    }

    @Test
    void withoutAProgramThereAreNoLifts() throws Exception {
        AccountId account = TestSessions.newAccount();
        send("PUT", account, "/v1/profile", profile());

        assertThat(map(send("GET", account, "/v1/training-progress"))).containsEntry("lifts", List.of()).containsEntry("trackedLifts", 0);
    }

    private AccountId withAProgram() {
        return withAProgram(own("bench_press", 6, 10), own("squat", 6, 10), own("barbell_curl", 8, 12));
    }

    @SafeVarargs
    private AccountId withAProgram(Map<String, Object>... moves) {
        AccountId account = TestSessions.newAccount();
        send("PUT", account, "/v1/profile", profile());
        assertThat(send("PUT", account, "/v1/program", program(List.of(moves)))).hasStatusOk();
        return account;
    }

    /** Two days: Monday and Thursday, both bench and squat. */
    private AccountId withTwoDays() {
        AccountId account = TestSessions.newAccount();
        send("PUT", account, "/v1/profile", profile());
        List<Map<String, Object>> moves = List.of(own("bench_press", 6, 10), own("squat", 6, 10));
        assertThat(send("PUT", account, "/v1/program", Map.of("days", List.of(Map.of("name", "A", "weekday", "MONDAY", "exercises", moves),
                Map.of("name", "B", "weekday", "THURSDAY", "exercises", moves))))).hasStatusOk();
        return account;
    }

    private static Map<String, Object> program(List<Map<String, Object>> moves) {
        return Map.of("days", List.of(Map.of("name", "Full body", "weekday", "MONDAY", "exercises", moves)));
    }

    /** The program made {@code ago}: the weekly call's window opens then (TrainingStatusReader). */
    private void backdateProgram(AccountId account, Duration ago) {
        jdbc.sql("update training.program set created_at = :at where account_id = :account")
                .param("at", clock.instant().minus(ago).atOffset(ZoneOffset.UTC)).param("account", account.value()).update();
    }

    /** This week's Monday, 00:00 UTC (the test profile's time zone). */
    private Instant thisMonday() {
        return ProgressSummary.monday(LocalDate.now(clock.withZone(ZoneOffset.UTC))).atStartOfDay(ZoneOffset.UTC).toInstant();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> lift(AccountId account, String exerciseId) throws Exception {
        return ((List<Map<String, Object>>) map(send("GET", account, "/v1/training-progress")).get("lifts")).stream()
                .filter(lift -> exerciseId.equals(lift.get("exerciseId"))).findFirst().orElseThrow();
    }

    private static Map<String, Object> profile() {
        return Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996, "programChoice", "BUILD_ONE_FOR_ME",
                "units", "METRIC", "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC"));
    }

    private static Map<String, Object> own(String exercise, int min, int max) {
        return Map.of("exerciseId", exercise, "sets", 3, "reps", Map.of("min", min, "max", max));
    }

    private String start(AccountId account, Instant at) throws Exception {
        return start(account, at, 0);
    }

    /** A session of the program's day at {@code index}. */
    @SuppressWarnings("unchecked")
    private String start(AccountId account, Instant at, int index) throws Exception {
        Map<String, Object> day = ((List<Map<String, Object>>) map(send("GET", account, "/v1/program")).get("days")).get(index);
        MvcTestResult started = send("POST", account, "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", at.toString(),
                "programDayId", day.get("id")));
        assertThat(started).hasStatus(201);
        return (String) map(started).get("id");
    }

    /** A session off the program (no program day). */
    private String startOff(AccountId account, Instant at) throws Exception {
        MvcTestResult started = send("POST", account, "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", at.toString()));
        assertThat(started).hasStatus(201);
        return (String) map(started).get("id");
    }

    private void sets(AccountId account, String workout, String exercise, int count, double kg, int reps, int rir, String type) {
        for (int i = 0; i < count; i++) {
            set(account, workout, exercise, kg, reps, rir, type, "BOTH");
        }
    }

    private void set(AccountId account, String workout, String exercise, double kg, int reps, int rir, String type, String side) {
        Map<String, Object> body = new HashMap<>(Map.of("clientId", UUID.randomUUID(), "exerciseId", exercise, "setType", type, "loadKg", kg,
                "reps", reps, "rir", rir, "side", side));
        assertThat(send("POST", account, "/v1/workouts/" + workout + "/sets", body)).hasStatus(201);
    }

    private MvcTestResult send(String method, AccountId account, String uri) {
        return send(method, account, uri, null);
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
