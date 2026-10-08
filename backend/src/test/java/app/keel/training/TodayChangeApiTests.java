package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.IntStream;
import org.assertj.core.groups.Tuple;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * Today's session changed and a move swapped over the API (K-964, ADR-073 #5-#6, contract /v1/program/today and
 * /v1/program/swap), on a fixed clock: Wednesday 7 October 2026, noon UTC (no profile: the user's day is UTC's). The
 * user's own week: Push on Wednesday (today), Legs on Thursday, Pull on Saturday.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({PostgresTestConfiguration.class, TodayChangeApiTests.FixedClock.class})
class TodayChangeApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final LocalDate WEDNESDAY = LocalDate.of(2026, 10, 7);
    private static final Instant NOW = WEDNESDAY.atTime(12, 0).toInstant(ZoneOffset.UTC);

    /** The server's clock, fixed: today is the week's Wednesday whenever the tests run. */
    @TestConfiguration
    static class FixedClock {
        @Bean
        @Primary
        Clock fixedClock() {
            return Clock.fixed(NOW, ZoneOffset.UTC);
        }
    }

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    ProgramStore programs;

    @Test
    void theProgramCarriesThisWeeksSessionsAndEachMovesSwapOptions() throws Exception {
        AccountId account = TestSessions.newAccount();

        Map<String, Object> program = map(send(account, "PUT", "/v1/program", week("WEDNESDAY", "THURSDAY", "SATURDAY")));

        assertThat(sessions(program)).extracting(session -> session.get("date")).containsExactly("2026-10-07", "2026-10-08", "2026-10-10");
        assertThat(sessions(program).getFirst()).isEqualTo(Map.of("programDayId", dayId(program, 0), "date", "2026-10-07",
                "exerciseIds", List.of("bench_press", "overhead_press", "barbell_row", "triceps_pushdown", "incline_dumbbell_press")));
        assertThat(move(program, 1, "squat").get("swapOptions")).isEqualTo(List.of("hack_squat", "leg_press", "bulgarian_split_squat"));
    }

    @Test
    void shortOnTimeIsTheFirstMovesAndTheProgramAndTheWeeksPlanStayAsTheyAre() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> program = map(send(account, "PUT", "/v1/program", week("WEDNESDAY", "THURSDAY", "SATURDAY")));
        List<ProgramPeriod> history = programs.history(account);

        Map<String, Object> changed = map(send(account, "POST", "/v1/program/today", Map.of("programDayId", dayId(program, 0), "change", "SHORT")));

        assertThat(sessions(changed).getFirst()).containsEntry("short", true)
                .containsEntry("exerciseIds", List.of("bench_press", "overhead_press", "barbell_row"));
        assertThat(changed.get("days")).isEqualTo(program.get("days"));
        // The session counts for the week: the week asks as many sessions as before (K-535), none taken away.
        assertThat(programs.history(account)).isEqualTo(history);
    }

    @Test
    void moveItPutsTodaysSessionOnTomorrowAndTheWeekRelaysItself() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> program = map(send(account, "PUT", "/v1/program", week("WEDNESDAY", "THURSDAY", "SATURDAY")));
        List<ProgramPeriod> history = programs.history(account);

        Map<String, Object> moved = map(send(account, "POST", "/v1/program/today", Map.of("programDayId", dayId(program, 0), "change", "MOVE")));

        assertThat(sessions(moved)).extracting(session -> session.get("programDayId"), session -> session.get("date"), session -> session.get("moved"))
                .containsExactly(Tuple.tuple(dayId(program, 0), "2026-10-08", true),
                        Tuple.tuple(dayId(program, 1), "2026-10-09", true),
                        Tuple.tuple(dayId(program, 2), "2026-10-10", null));
        assertThat(map(send(account, "GET", "/v1/program", null))).isEqualTo(moved);
        assertThat(programs.history(account)).isEqualTo(history);
        // No longer today's: it does not move again today.
        assertThat(send(account, "POST", "/v1/program/today", Map.of("programDayId", dayId(program, 0), "change", "MOVE"))).hasStatus(409);
    }

    @Test
    void aMoveThatWouldPassSundayChangesNothing() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> program = map(send(account, "PUT", "/v1/program", week("WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY")));

        assertThat(send(account, "POST", "/v1/program/today", Map.of("programDayId", dayId(program, 0), "change", "MOVE"))).hasStatus(409);
        assertThat(sessions(map(send(account, "GET", "/v1/program", null)))).isEqualTo(sessions(program));
    }

    @Test
    void skipTodayAddsNoCatchUp() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> program = map(send(account, "PUT", "/v1/program", week("WEDNESDAY", "THURSDAY", "SATURDAY")));
        List<ProgramPeriod> history = programs.history(account);

        Map<String, Object> skipped = map(send(account, "POST", "/v1/program/today", Map.of("programDayId", dayId(program, 0), "change", "SKIP")));

        assertThat(sessions(skipped)).extracting(session -> session.get("date")).containsExactly("2026-10-07", "2026-10-08", "2026-10-10");
        assertThat(sessions(skipped)).extracting(session -> session.get("skipped")).containsExactly(true, null, null);
        assertThat(sessions(skipped)).allSatisfy(session -> assertThat(session).doesNotContainKey("moved"));
        assertThat(skipped.get("days")).isEqualTo(program.get("days"));
        assertThat(programs.history(account)).isEqualTo(history);
        assertThat(send(account, "POST", "/v1/program/today", Map.of("programDayId", dayId(program, 0), "change", "SHORT"))).hasStatus(409);
    }

    @Test
    void onlyTodaysSessionChanges() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> program = map(send(account, "PUT", "/v1/program", week("WEDNESDAY", "THURSDAY", "SATURDAY")));

        assertThat(send(account, "POST", "/v1/program/today", Map.of("programDayId", dayId(program, 1), "change", "SHORT"))).hasStatus(409);
        assertThat(send(account, "POST", "/v1/program/today", Map.of("programDayId", UUID.randomUUID(), "change", "SKIP"))).hasStatus(409);
        assertThat(send(account, "POST", "/v1/program/today", Map.of("programDayId", dayId(program, 0)))).hasStatus(400);
        assertThat(send(TestSessions.newAccount(), "POST", "/v1/program/today", Map.of("programDayId", dayId(program, 0), "change", "SKIP")))
                .hasStatus(404);
    }

    @Test
    void aSwapForTodayIsInTodaysSessionOnlyAndSwappingBackUndoesIt() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> program = map(send(account, "PUT", "/v1/program", week("WEDNESDAY", "THURSDAY", "SATURDAY")));

        Map<String, Object> swapped = map(send(account, "POST", "/v1/program/swap", swap(dayId(program, 0), "bench_press", "dumbbell_bench_press", "TODAY")));

        assertThat(sessions(swapped).getFirst().get("exerciseIds"))
                .isEqualTo(List.of("dumbbell_bench_press", "overhead_press", "barbell_row", "triceps_pushdown", "incline_dumbbell_press"));
        assertThat(swapped.get("days")).isEqualTo(program.get("days"));
        Map<String, Object> back = map(send(account, "POST", "/v1/program/swap", swap(dayId(program, 0), "bench_press", "bench_press", "TODAY")));
        assertThat(sessions(back)).isEqualTo(sessions(program));
        // Not today's session; not one of the move's options; not a move of the day.
        assertThat(send(account, "POST", "/v1/program/swap", swap(dayId(program, 1), "squat", "leg_press", "TODAY"))).hasStatus(409);
        assertThat(send(account, "POST", "/v1/program/swap", swap(dayId(program, 0), "bench_press", "squat", "TODAY"))).hasStatus(400);
        assertThat(send(account, "POST", "/v1/program/swap", swap(dayId(program, 0), "squat", "leg_press", "TODAY"))).hasStatus(404);
    }

    @Test
    void aSwapFromNowOnChangesTheProgramInPlaceTheNewMoveWithItsOwnHistoryAndTheReviewLogCleared() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> entered = map(send(account, "PUT", "/v1/program", week("WEDNESDAY", "THURSDAY", "SATURDAY")));
        Map<?, ?> review = (Map<?, ?>) entered.get("review");
        String first = (String) ((Map<?, ?>) ((List<?>) review.get("suggestions")).getFirst()).get("id");
        Map<String, Object> reviewed = map(send(account, "POST", "/v1/program/review/apply", Map.of("reviewId", review.get("id"), "suggestionIds", List.of(first))));
        assertThat((List<?>) ((Map<?, ?>) reviewed.get("review")).get("applied")).isNotEmpty();
        assertThat(send(account, "PUT", "/v1/program/starting-weights", Map.of("weights", List.of(Map.of("exerciseId", "bench_press", "kg", 80)))))
                .hasStatusOk();
        // Hack squats done last week: the move's own history.
        logged(account, "2026-10-01T15:00:00Z", null, "hack_squat", 100);
        Map<String, Object> before = map(send(account, "GET", "/v1/program", null));
        List<ProgramPeriod> history = programs.history(account);

        Map<String, Object> swapped = map(send(account, "POST", "/v1/program/swap", swap(dayId(before, 1), "squat", "hack_squat", "FROM_NOW_ON")));

        assertThat(swapped).containsEntry("id", before.get("id")).containsEntry("source", "OWN");
        assertThat(dayIds(swapped)).isEqualTo(dayIds(before));
        Map<?, ?> squat = move(before, 1, "squat");
        Map<?, ?> hackSquat = move(swapped, 1, "hack_squat");
        assertThat(moves(swapped, 1)).extracting(move -> move.get("exerciseId")).containsExactly(moves(before, 1).stream()
                .map(move -> "squat".equals(move.get("exerciseId")) ? "hack_squat" : move.get("exerciseId")).toArray());
        assertThat(hackSquat.get("baseSets")).isEqualTo(squat.get("baseSets"));
        assertThat(hackSquat.get("reps")).isEqualTo(squat.get("reps"));
        assertThat(hackSquat.containsKey("nextLoadKg")).as("no target yet").isFalse();
        assertThat(new BigDecimal(String.valueOf(((Map<?, ?>) hackSquat.get("lastBestSet")).get("loadKg")))).isEqualByComparingTo("100");
        assertThat(new BigDecimal(String.valueOf(move(swapped, 0, "bench_press").get("nextLoadKg")))).isEqualByComparingTo("80");
        assertThat((List<?>) ((Map<?, ?>) swapped.get("review")).get("applied")).isEmpty();
        assertThat(programs.history(account)).isEqualTo(history);
        // Nothing left to undo: the review's undo changes nothing, and does not refuse.
        MvcTestResult undo = send(account, "POST", "/v1/program/review/undo", Map.of());
        assertThat(undo).hasStatusOk();
        assertThat(map(undo).get("program")).isEqualTo(swapped);
    }

    @Test
    @SuppressWarnings("unchecked")
    void aSwapForTodayIsAPlannedMoveOfItsOwnWithItsHistoryAndTable() throws Exception {
        // ADR-073 #6, ADR-075 #3: the move in its place has the planned move's sets and range, no target, its own last time.
        AccountId account = TestSessions.newAccount();
        Map<String, Object> program = map(send(account, "PUT", "/v1/program", week("WEDNESDAY", "THURSDAY", "SATURDAY")));
        logged(account, "2026-10-01T15:00:00Z", null, "dumbbell_bench_press", 30);

        Map<String, Object> swapped = map(send(account, "POST", "/v1/program/swap", swap(dayId(program, 0), "bench_press", "dumbbell_bench_press", "TODAY")));

        List<Map<String, Object>> swaps = (List<Map<String, Object>>) sessions(swapped).getFirst().get("swaps");
        assertThat(swaps).hasSize(1);
        assertThat(swaps.getFirst()).containsEntry("insteadOf", "bench_press");
        Map<?, ?> exercise = (Map<?, ?>) swaps.getFirst().get("exercise");
        Map<?, ?> bench = move(program, 0, "bench_press");
        assertThat(exercise.get("exerciseId")).isEqualTo("dumbbell_bench_press");
        assertThat(exercise.get("baseSets")).isEqualTo(bench.get("baseSets"));
        assertThat(exercise.get("reps")).isEqualTo(bench.get("reps"));
        assertThat(exercise.containsKey("nextLoadKg")).as("no target").isFalse();
        assertThat(new BigDecimal(String.valueOf(((Map<?, ?>) exercise.get("lastBestSet")).get("loadKg")))).isEqualByComparingTo("30");
        assertThat(exercise.containsKey("lighterLoadKg")).as("its in-session table, from its last time").isTrue();
        assertThat(sessions(program).getFirst()).doesNotContainKey("swaps");
    }

    @Test
    void aSessionStartedTodayIsNotMovedSkippedOrSwappedForToday() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> program = map(send(account, "PUT", "/v1/program", week("WEDNESDAY", "THURSDAY", "SATURDAY")));
        String workout = logged(account, "2026-10-07T11:00:00Z", dayId(program, 0), "bench_press", 80);

        assertThat(send(account, "POST", "/v1/program/today", Map.of("programDayId", dayId(program, 0), "change", "MOVE"))).hasStatus(409);
        assertThat(send(account, "POST", "/v1/program/today", Map.of("programDayId", dayId(program, 0), "change", "SKIP"))).hasStatus(409);
        assertThat(send(account, "POST", "/v1/program/swap", swap(dayId(program, 0), "overhead_press", "dumbbell_shoulder_press", "TODAY"))).hasStatus(409);
        // Finished, the same: a session done is done.
        assertThat(send(account, "POST", "/v1/workouts/" + workout + "/finish", Map.of("endedAt", "2026-10-07T11:50:00Z", "uncleanExerciseIds", List.of())))
                .hasStatusOk();
        assertThat(send(account, "POST", "/v1/program/today", Map.of("programDayId", dayId(program, 0), "change", "SKIP"))).hasStatus(409);
        assertThat(sessions(map(send(account, "GET", "/v1/program", null)))).isEqualTo(sessions(program));
        // Running short of time in the middle of it is still allowed; a swap from now on is the program's.
        assertThat(send(account, "POST", "/v1/program/today", Map.of("programDayId", dayId(program, 0), "change", "SHORT"))).hasStatusOk();
        assertThat(send(account, "POST", "/v1/program/swap", swap(dayId(program, 0), "overhead_press", "dumbbell_shoulder_press", "FROM_NOW_ON")))
                .hasStatusOk();
    }

    @Test
    void aSessionStartedYesterdayOrForAnotherDayDoesNotHoldTodaysBack() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> program = map(send(account, "PUT", "/v1/program", week("WEDNESDAY", "THURSDAY", "SATURDAY")));
        logged(account, "2026-10-06T23:30:00Z", dayId(program, 0), "bench_press", 80);
        logged(account, "2026-10-07T08:00:00Z", dayId(program, 1), "squat", 100);

        assertThat(send(account, "POST", "/v1/program/today", Map.of("programDayId", dayId(program, 0), "change", "SKIP"))).hasStatusOk();
    }

    @Test
    void aSwapFromNowOnEndsTodaysSwapOfThatMoveSoItIsNotRevivedLater() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> program = map(send(account, "PUT", "/v1/program", week("WEDNESDAY", "THURSDAY", "SATURDAY")));
        Object push = dayId(program, 0);

        assertThat(send(account, "POST", "/v1/program/swap", swap(push, "bench_press", "dumbbell_bench_press", "TODAY"))).hasStatusOk();
        assertThat(send(account, "POST", "/v1/program/swap", swap(push, "bench_press", "machine_chest_press", "FROM_NOW_ON"))).hasStatusOk();
        Map<String, Object> back = map(send(account, "POST", "/v1/program/swap", swap(push, "machine_chest_press", "bench_press", "FROM_NOW_ON")));

        assertThat(sessions(back).getFirst().get("exerciseIds")).isEqualTo(List.of("bench_press", "overhead_press", "barbell_row", "triceps_pushdown", "incline_dumbbell_press"));
        assertThat(sessions(back).getFirst()).doesNotContainKey("swaps");
    }

    @Test
    void aSwapForTodayIsCheckedAgainstTheSessionAfterTodaysEarlierSwaps() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> program = map(send(account, "PUT", "/v1/program", week("WEDNESDAY", "THURSDAY", "SATURDAY")));
        Object push = dayId(program, 0);
        assertThat(move(program, 0, "incline_dumbbell_press").get("swapOptions")).asInstanceOf(org.assertj.core.api.InstanceOfAssertFactories.LIST)
                .contains("dumbbell_bench_press");

        assertThat(send(account, "POST", "/v1/program/swap", swap(push, "bench_press", "dumbbell_bench_press", "TODAY"))).hasStatusOk();

        // Dumbbell bench presses are in the session already: not twice.
        assertThat(send(account, "POST", "/v1/program/swap", swap(push, "incline_dumbbell_press", "dumbbell_bench_press", "TODAY"))).hasStatus(400);
        // The same move swapped again for another one is fine.
        assertThat(send(account, "POST", "/v1/program/swap", swap(push, "bench_press", "machine_chest_press", "TODAY"))).hasStatusOk();
    }

    @Test
    void aMovedSessionIsFreshOnItsNewDayTheShortVersionAndTodaysSwapsStay() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> program = map(send(account, "PUT", "/v1/program", week("WEDNESDAY", "THURSDAY", "SATURDAY")));
        Object push = dayId(program, 0);
        assertThat(send(account, "POST", "/v1/program/today", Map.of("programDayId", push, "change", "SHORT"))).hasStatusOk();
        assertThat(send(account, "POST", "/v1/program/swap", swap(push, "bench_press", "dumbbell_bench_press", "TODAY"))).hasStatusOk();

        Map<String, Object> moved = map(send(account, "POST", "/v1/program/today", Map.of("programDayId", push, "change", "MOVE")));

        Map<String, Object> session = sessions(moved).getFirst();
        assertThat(session).containsEntry("programDayId", push).containsEntry("date", "2026-10-08").containsEntry("moved", true)
                .containsEntry("exerciseIds", List.of("bench_press", "overhead_press", "barbell_row", "triceps_pushdown", "incline_dumbbell_press")).doesNotContainKey("short").doesNotContainKey("swaps");
    }

    /** A workout begun at {@code startedAt} (of a program day or none) with one working set of the move; its id. */
    private String logged(AccountId account, String startedAt, Object programDayId, String exercise, int kg) throws Exception {
        Map<String, Object> body = new HashMap<>(Map.of("clientId", UUID.randomUUID(), "startedAt", startedAt));
        if (programDayId != null) {
            body.put("programDayId", programDayId);
        }
        MvcTestResult started = send(account, "POST", "/v1/workouts", body);
        assertThat(started).hasStatus(201);
        String workout = (String) JSON.readValue(started.getResponse().getContentAsString(), Map.class).get("id");
        assertThat(send(account, "POST", "/v1/workouts/" + workout + "/sets", Map.of("clientId", UUID.randomUUID(), "exerciseId", exercise,
                "setType", "WORKING", "loadKg", kg, "reps", 8, "rir", 1))).hasStatus(201);
        return workout;
    }

    private static Map<String, Object> week(String... weekdays) {
        List<Map<String, Object>> days = List.of(
                day("Push", compound("bench_press"), compound("overhead_press"), compound("barbell_row"), isolation("triceps_pushdown"),
                        compound("incline_dumbbell_press")),
                day("Legs", compound("squat"), compound("romanian_deadlift")),
                day("Pull", compound("lat_pulldown"), isolation("barbell_curl")),
                day("Arms", isolation("dumbbell_curl")),
                day("Calves", isolation("standing_calf_raise")));
        return Map.of("days", IntStream.range(0, weekdays.length).mapToObj(d -> {
            Map<String, Object> day = new HashMap<>(days.get(d));
            day.put("weekday", weekdays[d]);
            return day;
        }).toList());
    }

    @SafeVarargs
    private static Map<String, Object> day(String name, Map<String, Object>... moves) {
        return Map.of("name", name, "exercises", List.of(moves));
    }

    private static Map<String, Object> compound(String exercise) {
        return Map.of("exerciseId", exercise, "sets", 3, "reps", Map.of("min", 6, "max", 10));
    }

    private static Map<String, Object> isolation(String exercise) {
        return Map.of("exerciseId", exercise, "sets", 3, "reps", Map.of("min", 8, "max", 12));
    }

    private static Map<String, Object> swap(Object day, String exercise, String to, String scope) {
        return Map.of("programDayId", day, "exerciseId", exercise, "to", to, "scope", scope);
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> sessions(Map<String, Object> program) {
        return (List<Map<String, Object>>) program.get("week");
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> days(Map<String, Object> program) {
        return (List<Map<String, Object>>) program.get("days");
    }

    private static Object dayId(Map<String, Object> program, int day) {
        return days(program).get(day).get("id");
    }

    private static List<Object> dayIds(Map<String, Object> program) {
        return days(program).stream().map(day -> day.get("id")).toList();
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> moves(Map<String, Object> program, int day) {
        return (List<Map<String, Object>>) days(program).get(day).get("exercises");
    }

    private static Map<?, ?> move(Map<String, Object> program, int day, String exercise) {
        return moves(program, day).stream().filter(move -> exercise.equals(move.get("exerciseId"))).findFirst().orElseThrow();
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

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(Object value) {
        return (Map<String, Object>) value;
    }

    private static Map<String, Object> map(MvcTestResult result) throws Exception {
        assertThat(result).hasStatusOk();
        return map(JSON.readValue(result.getResponse().getContentAsString(), Map.class));
    }
}
