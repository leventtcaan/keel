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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.UnaryOperator;
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
 * The program edited by its day and move ids over the API (K-995, ADR-073 #4, Ek 7, contract PATCH /v1/program), on a fixed
 * clock: Wednesday 7 October 2026, noon UTC. The generated four-day program on Monday, Wednesday, Friday and Saturday.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({PostgresTestConfiguration.class, ProgramEditApiTests.FixedClock.class})
class ProgramEditApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final Instant NOW = LocalDate.of(2026, 10, 7).atTime(12, 0).toInstant(ZoneOffset.UTC);

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
    void anEditKeepsTheSourceTheDaysAndEachMovesRowAndTargetItDoesNotChange() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> program = generated(account);
        Object benchRow = move(program, 0, "bench_press").get("id");
        assertThat(benchRow).isNotNull();

        Map<String, Object> edited = map(send(account, "PATCH", "/v1/program", edit(program, days -> {
            days.getFirst().put("weekday", "TUESDAY");
            setsOf(days.getFirst(), "bench_press", 2);
            return days;
        })));

        assertThat(edited).containsEntry("id", program.get("id")).containsEntry("source", "GENERATED");
        assertThat(dayIds(edited)).isEqualTo(dayIds(program));
        assertThat(days(edited).getFirst()).containsEntry("weekday", "TUESDAY").containsEntry("nameKey", days(program).getFirst().get("nameKey"));
        Map<?, ?> bench = move(edited, 0, "bench_press");
        assertThat(bench.get("id")).isEqualTo(benchRow);
        assertThat(bench.get("baseSets")).isEqualTo(2);
        assertThat(new BigDecimal(String.valueOf(bench.get("nextLoadKg")))).isEqualByComparingTo("80");
        assertThat(moves(edited, 1)).isEqualTo(moves(program, 1));
        assertThat(applied(edited)).as("the review's changes only").isEmpty();
        assertThat(edits(edited)).hasSize(1);
        assertThat(edits(edited).getFirst()).containsOnlyKeys("id", "editedAt");
    }

    @Test
    void anEditIsUndoneAsAReviewChangeIs() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> program = generated(account);
        Map<String, Object> edited = map(send(account, "PATCH", "/v1/program", edit(program, days -> {
            days.getFirst().put("name", "Push day");
            removeMove(days.get(1), 0);
            return days;
        })));
        Object change = edits(edited).getFirst().get("id");

        MvcTestResult undone = send(account, "POST", "/v1/program/review/undo", Map.of("changeId", change));

        Map<String, Object> back = map(map(undone).get("program"));
        assertThat(days(back)).extracting(day -> day.get("nameKey")).isEqualTo(days(program).stream().map(day -> day.get("nameKey")).toList());
        assertThat(moves(back, 1)).extracting(move -> move.get("exerciseId"))
                .isEqualTo(moves(program, 1).stream().map(move -> move.get("exerciseId")).toList());
        assertThat(new BigDecimal(String.valueOf(move(back, 0, "bench_press").get("nextLoadKg")))).isEqualByComparingTo("80");
        assertThat(edits(back)).isEmpty();
    }

    @Test
    void undoingAReviewChangeBeforeAnEditUndoesTheEditWithItAndSaysSo() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> program = map(send(account, "PUT", "/v1/program", Map.of("days", List.of(
                Map.of("name", "Upper", "weekday", "MONDAY", "exercises", List.of(Map.of("exerciseId", "bench_press", "sets", 3, "reps", Map.of("min", 3, "max", 5)))),
                Map.of("name", "Lower", "weekday", "THURSDAY", "exercises", List.of(Map.of("exerciseId", "squat", "sets", 3, "reps", Map.of("min", 6, "max", 10))))))));
        Map<?, ?> review = (Map<?, ?>) program.get("review");
        Object reps = ((List<?>) review.get("suggestions")).stream().map(suggestion -> ((Map<?, ?>) suggestion).get("id"))
                .filter("REP_RANGE:bench_press"::equals).findFirst().orElseThrow();
        Map<String, Object> reviewed = map(send(account, "POST", "/v1/program/review/apply", Map.of("reviewId", review.get("id"), "suggestionIds", List.of(reps))));
        Map<String, Object> edited = map(send(account, "PATCH", "/v1/program", edit(reviewed, days -> {
            setsOf(days.get(1), "squat", 4);
            return days;
        })));
        assertThat(applied(edited)).hasSize(1);
        assertThat(edits(edited)).hasSize(1);

        Map<String, Object> undone = map(send(account, "POST", "/v1/program/review/undo", Map.of("changeId", applied(edited).getFirst().get("id"))));

        assertThat(undone.get("alsoUndone")).isEqualTo(List.of(edits(edited).getFirst().get("id")));
        assertThat(edits(map(undone.get("program")))).isEmpty();
        assertThat(moves(map(undone.get("program")), 1).getFirst().get("baseSets")).isEqualTo(3);
    }

    @Test
    void aDayOnAnotherWeekdayReLaysThisWeek() throws Exception {
        // Wednesday's session moved to Thursday, then its day put on Thursday by an edit: it is on its weekday, not moved.
        AccountId account = TestSessions.newAccount();
        Map<String, Object> program = generated(account);
        Object wednesday = days(program).get(1).get("id");
        assertThat(send(account, "POST", "/v1/program/today", Map.of("programDayId", wednesday, "change", "MOVE"))).hasStatusOk();

        Map<String, Object> edited = map(send(account, "PATCH", "/v1/program", edit(program, days -> {
            days.get(1).put("weekday", "THURSDAY");
            return days;
        })));

        Map<String, Object> session = sessions(edited).stream().filter(one -> wednesday.equals(one.get("programDayId"))).findFirst().orElseThrow();
        assertThat(session).containsEntry("date", "2026-10-08").doesNotContainKey("moved");
    }

    @Test
    void anIdTheProgramDoesNotHaveIsAConflictAndNothingChanges() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> program = generated(account);

        assertThat(send(account, "PATCH", "/v1/program", edit(program, days -> {
            days.getFirst().put("id", UUID.randomUUID());
            return days;
        }))).hasStatus(409);
        assertThat(send(account, "PATCH", "/v1/program", edit(program, days -> {
            List<Map<String, Object>> moves = exercises(days.getFirst());
            moves.getFirst().put("id", UUID.randomUUID());
            return days;
        }))).hasStatus(409);
        assertThat(map(send(account, "GET", "/v1/program", null))).isEqualTo(program);
    }

    @Test
    void anEditOutsideTheLimitsIsRefusedAndOneThatChangesNothingLogsNothing() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> program = generated(account);

        // A new day needs a name; a weekday once; a move the catalog does not have.
        assertThat(send(account, "PATCH", "/v1/program", edit(program, days -> {
            days.add(new HashMap<>(Map.of("weekday", "SUNDAY", "exercises", List.of(Map.of("exerciseId", "squat", "sets", 3, "reps", Map.of("min", 6, "max", 10))))));
            return days;
        }))).hasStatus(400);
        assertThat(send(account, "PATCH", "/v1/program", edit(program, days -> {
            days.get(1).put("weekday", days.getFirst().get("weekday"));
            return days;
        }))).hasStatus(400);
        assertThat(send(account, "PATCH", "/v1/program", edit(program, days -> {
            exercises(days.getFirst()).getFirst().put("exerciseId", "no_such_move");
            return days;
        }))).hasStatus(400);
        assertThat(edits(map(send(account, "PATCH", "/v1/program", edit(program, days -> days))))).isEmpty();
        assertThat(send(TestSessions.newAccount(), "PATCH", "/v1/program", edit(program, days -> days))).hasStatus(404);
    }

    @Test
    void anotherRangeDropsTheStartingWeightSoADiscardedSessionLeavesNoTargetForIt() throws Exception {
        // #518 review: bench started at 80 kg for 6-10, edited to 8-12, a session, discarded: no 80 kg target for 8-12.
        AccountId account = TestSessions.newAccount();
        Map<String, Object> program = generated(account);
        Object upper = days(program).getFirst().get("id");
        assertThat(send(account, "PATCH", "/v1/program", edit(program, days -> {
            exercises(days.getFirst()).stream().filter(move -> "bench_press".equals(move.get("exerciseId"))).findFirst().orElseThrow()
                    .put("reps", Map.of("min", 8, "max", 12));
            return days;
        }))).hasStatusOk();
        String workout = workout(account, "2026-10-07T10:00:00Z", upper, "bench_press", 70);
        assertThat(send(account, "POST", "/v1/workouts/" + workout + "/finish", Map.of("endedAt", "2026-10-07T10:50:00Z", "uncleanExerciseIds", List.of())))
                .hasStatusOk();
        assertThat(move(map(send(account, "GET", "/v1/program", null)), 0, "bench_press").get("nextLoadKg")).isNotNull();

        assertThat(send(account, "DELETE", "/v1/workouts/" + workout, null)).hasStatus(204);

        assertThat(move(map(send(account, "GET", "/v1/program", null)), 0, "bench_press").containsKey("nextLoadKg")).isFalse();
    }

    @Test
    void aDayAnEditReLaysTakesBackTheSessionsItsMovePushed() throws Exception {
        // #518 review: Wednesday's session moved to Thursday pushed Thursday's to Friday; the edit puts Wednesday's day on
        // Tuesday: Thursday's is back on Thursday. Undoing the edit re-lays the week again: Wednesday's on Wednesday.
        AccountId account = TestSessions.newAccount();
        assertThat(send(account, "POST", "/v1/program/generate", Map.of("trainingDays", List.of("MONDAY", "WEDNESDAY", "THURSDAY", "SATURDAY"))))
                .hasStatusOk();
        Map<String, Object> program = map(send(account, "GET", "/v1/program", null));
        Object wednesday = days(program).get(1).get("id");
        Object thursday = days(program).get(2).get("id");
        assertThat(send(account, "POST", "/v1/program/today", Map.of("programDayId", wednesday, "change", "MOVE"))).hasStatusOk();

        Map<String, Object> edited = map(send(account, "PATCH", "/v1/program", edit(program, days -> {
            days.get(1).put("weekday", "TUESDAY");
            return days;
        })));

        assertThat(session(edited, thursday)).containsEntry("date", "2026-10-08").doesNotContainKey("moved");
        assertThat(session(edited, wednesday)).containsEntry("date", "2026-10-06").doesNotContainKey("moved");
        Map<String, Object> undone = map(map(send(account, "POST", "/v1/program/review/undo", Map.of("changeId", edits(edited).getFirst().get("id"))))
                .get("program"));
        assertThat(session(undone, wednesday)).containsEntry("date", "2026-10-07").doesNotContainKey("moved");
        assertThat(session(undone, thursday)).containsEntry("date", "2026-10-08");
    }

    @Test
    void aDayWhoseSessionStartedTodayKeepsItsWeekdayAndIsNotTakenOut() throws Exception {
        // #518 review (card item 7): as a move or a skip, a session done is done.
        AccountId account = TestSessions.newAccount();
        Map<String, Object> program = generated(account);
        workout(account, "2026-10-07T10:00:00Z", days(program).get(1).get("id"), "squat", 100);

        assertThat(send(account, "PATCH", "/v1/program", edit(program, days -> {
            days.get(1).put("weekday", "THURSDAY");
            return days;
        }))).hasStatus(409);
        assertThat(send(account, "PATCH", "/v1/program", edit(program, days -> {
            days.remove(1);
            return days;
        }))).hasStatus(409);
        // Its moves may change: the program is the plan from now on.
        assertThat(send(account, "PATCH", "/v1/program", edit(program, days -> {
            setsOf(days.get(1), "squat", 4);
            return days;
        }))).hasStatusOk();
    }

    @Test
    void aFreeSessionStartedTodayHoldsNoEditBack() throws Exception {
        // #518 review: a workout of no program day has no programDayId; it is no day's session.
        AccountId account = TestSessions.newAccount();
        Map<String, Object> program = generated(account);
        assertThat(send(account, "POST", "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", "2026-10-07T10:00:00Z"))).hasStatus(201);

        assertThat(send(account, "PATCH", "/v1/program", edit(program, days -> {
            days.get(1).put("weekday", "THURSDAY");
            return days;
        }))).hasStatusOk();
    }

    @Test
    void anUndoThatWouldMoveADayStartedTodayIsAConflict() throws Exception {
        // #518 review: the same guard for an undo (and an apply). The edit put Wednesday's day on Thursday; its workout was
        // started today all the same; the undo would put the day back on another weekday: refused, nothing changed.
        AccountId account = TestSessions.newAccount();
        Map<String, Object> program = generated(account);
        Object wednesday = days(program).get(1).get("id");
        Map<String, Object> edited = map(send(account, "PATCH", "/v1/program", edit(program, days -> {
            days.get(1).put("weekday", "THURSDAY");
            return days;
        })));
        workout(account, "2026-10-07T10:00:00Z", wednesday, "squat", 100);

        assertThat(send(account, "POST", "/v1/program/review/undo", Map.of("changeId", edits(edited).getFirst().get("id")))).hasStatus(409);
        assertThat(map(send(account, "GET", "/v1/program", null)).get("days")).isEqualTo(edited.get("days"));
    }

    @Test
    void todaysSwapToAMoveTheEditPlansEndsSoTheMoveIsInTheSessionOnce() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> program = generated(account);
        Object lower = days(program).get(1).get("id");
        assertThat(send(account, "POST", "/v1/program/swap", Map.of("programDayId", lower, "exerciseId", "squat", "to", "hack_squat", "scope", "TODAY")))
                .hasStatusOk();

        Map<String, Object> edited = map(send(account, "PATCH", "/v1/program", edit(program, days -> {
            exercises(days.get(1)).add(new HashMap<>(Map.of("exerciseId", "hack_squat", "sets", 2, "reps", Map.of("min", 6, "max", 10))));
            return days;
        })));

        @SuppressWarnings("unchecked")
        List<Object> moves = (List<Object>) session(edited, lower).get("exerciseIds");
        assertThat(moves).contains("squat");
        assertThat(moves.stream().filter("hack_squat"::equals).count()).isEqualTo(1);
        assertThat(session(edited, lower)).doesNotContainKey("swaps");
    }

    @Test
    void undoingEverySuggestionKeepsAnEditMadeBeforeThem() throws Exception {
        // #518 review: "N changes applied · Undo" is the N suggestions.
        AccountId account = TestSessions.newAccount();
        Map<String, Object> own = map(send(account, "PUT", "/v1/program", Map.of("days", List.of(
                Map.of("name", "Upper", "weekday", "MONDAY", "exercises", List.of(Map.of("exerciseId", "bench_press", "sets", 3, "reps", Map.of("min", 3, "max", 5)))),
                Map.of("name", "Lower", "weekday", "THURSDAY", "exercises", List.of(Map.of("exerciseId", "squat", "sets", 3, "reps", Map.of("min", 6, "max", 10))))))));
        Map<String, Object> edited = map(send(account, "PATCH", "/v1/program", edit(own, days -> {
            days.get(1).put("name", "Legs");
            return days;
        })));
        Map<?, ?> review = (Map<?, ?>) edited.get("review");
        Object reps = ((List<?>) review.get("suggestions")).stream().map(suggestion -> ((Map<?, ?>) suggestion).get("id"))
                .filter("REP_RANGE:bench_press"::equals).findFirst().orElseThrow();
        assertThat(send(account, "POST", "/v1/program/review/apply", Map.of("reviewId", review.get("id"), "suggestionIds", List.of(reps)))).hasStatusOk();

        Map<String, Object> undone = map(send(account, "POST", "/v1/program/review/undo", Map.of()));

        Map<String, Object> back = map(undone.get("program"));
        assertThat(undone.get("alsoUndone")).isEqualTo(List.of());
        assertThat(applied(back)).isEmpty();
        assertThat(edits(back)).hasSize(1);
        assertThat(days(back).get(1)).containsEntry("name", "Legs");
        assertThat(moves(back, 0).getFirst().get("reps")).isEqualTo(Map.of("min", 3, "max", 5));
    }

    @Test
    void aDayAddedIsFilledFromTheGeneratorAndEveryDayAndTargetTheProgramHadStaysAsItWas() throws Exception {
        // K-1012, ADR-073 Ek 9: Monday and Friday plus Wednesday is the three-day template, its second day.
        AccountId account = TestSessions.newAccount();
        Map<String, Object> program = twoDays(account);

        Map<String, Object> added = map(send(account, "POST", "/v1/program/days", Map.of("weekday", "WEDNESDAY")));

        assertThat(added).containsEntry("id", program.get("id")).containsEntry("source", "GENERATED");
        assertThat(days(added)).extracting(day -> day.get("weekday")).containsExactly("MONDAY", "WEDNESDAY", "FRIDAY");
        Map<String, Object> wednesday = days(added).get(1);
        assertThat(wednesday).containsEntry("nameKey", "programDays.lower.name").doesNotContainKey("name");
        assertThat(wednesday.get("id")).isNotNull();
        assertThat(moves(added, 1)).extracting(move -> move.get("exerciseId"))
                .containsExactly("squat", "romanian_deadlift", "leg_extension", "standing_calf_raise");
        assertThat(moves(added, 1)).allSatisfy(move -> assertThat(move.get("id")).isNotNull());
        List<Map<String, Object>> others = new ArrayList<>(days(added));
        others.remove(1);
        assertThat(others).as("every day the program had, its rows, targets and ids").isEqualTo(days(program));
        assertThat(new BigDecimal(String.valueOf(move(added, 0, "bench_press").get("nextLoadKg")))).isEqualByComparingTo("80");
        assertThat(edits(added)).hasSize(1);
        assertThat(applied(added)).isEmpty();
        assertThat(map(send(account, "GET", "/v1/program", null))).isEqualTo(added);
    }

    @Test
    void aMoveTheProgramHasAStartingWeightForHasItInTheNewDayAndOnlyThatOne() throws Exception {
        // ADR-072 #5: the 100 kg squat is the squat's first target on the new day as on Monday; the romanian deadlift was given none.
        AccountId account = TestSessions.newAccount();
        Map<String, Object> program = twoDays(account);

        Map<String, Object> added = map(send(account, "POST", "/v1/program/days", Map.of("weekday", "WEDNESDAY")));

        assertThat(new BigDecimal(String.valueOf(move(added, 1, "squat").get("nextLoadKg")))).isEqualByComparingTo("100");
        assertThat(move(added, 1, "squat").get("nextReps")).isEqualTo(move(program, 0, "squat").get("nextReps"));
        assertThat(move(added, 1, "romanian_deadlift").get("nextLoadKg")).isNull();
        assertThat(move(added, 1, "leg_extension").get("nextLoadKg")).isNull();
    }

    @Test
    void aDayAddedLaterThisWeekIsInThisWeeksSessions() throws Exception {
        // Today is Wednesday 7 October: Thursday's new day is a session of this week, on Thursday.
        AccountId account = TestSessions.newAccount();
        twoDays(account);

        Map<String, Object> added = map(send(account, "POST", "/v1/program/days", Map.of("weekday", "THURSDAY")));

        Object thursday = days(added).get(1).get("id");
        assertThat(days(added).get(1)).containsEntry("weekday", "THURSDAY");
        assertThat(session(added, thursday)).containsEntry("date", "2026-10-08").doesNotContainKey("moved");
    }

    @Test
    void aDayAddedIsUndoneWithTheEditsChangeAndTheProgramIsAsItWas() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> program = twoDays(account);
        Map<String, Object> added = map(send(account, "POST", "/v1/program/days", Map.of("weekday", "WEDNESDAY")));

        MvcTestResult undone = send(account, "POST", "/v1/program/review/undo", Map.of("changeId", edits(added).getFirst().get("id")));

        Map<String, Object> back = map(map(undone).get("program"));
        assertThat(days(back)).isEqualTo(days(program));
        assertThat(edits(back)).isEmpty();
        assertThat(map(undone).get("alsoUndone")).isEqualTo(List.of());
    }

    @Test
    void anEditAfterTheAddIsUndoneWithItAndNamedWhenTheAddIsUndone() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> program = twoDays(account);
        Map<String, Object> added = map(send(account, "POST", "/v1/program/days", Map.of("weekday", "WEDNESDAY")));
        Object addChange = edits(added).getFirst().get("id");
        Map<String, Object> edited = map(send(account, "PATCH", "/v1/program", edit(added, days -> {
            setsOf(days.get(1), "squat", 2);
            return days;
        })));
        assertThat(edits(edited)).hasSize(2);
        Object editChange = edits(edited).get(1).get("id");

        Map<String, Object> undone = map(send(account, "POST", "/v1/program/review/undo", Map.of("changeId", addChange)));

        // The edit was made to the program with the day: on the program without it it no longer applies, so it goes with the add.
        assertThat(undone.get("alsoUndone")).isEqualTo(List.of(editChange));
        Map<String, Object> back = map(undone.get("program"));
        assertThat(days(back)).isEqualTo(days(program));
        assertThat(edits(back)).isEmpty();
    }

    @Test
    void aDayCanNotBeAddedOnATakenWeekdayToTheUsersOwnProgramOrOtherThanToTwoDaysAndNothingChanges() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> program = twoDays(account);
        assertThat(send(account, "POST", "/v1/program/days", Map.of("weekday", "FRIDAY"))).hasStatus(409);
        assertThat(map(send(account, "GET", "/v1/program", null))).isEqualTo(program);

        AccountId own = TestSessions.newAccount();
        assertThat(send(own, "PUT", "/v1/program", Map.of("days", List.of(
                Map.of("name", "Upper", "weekday", "MONDAY", "exercises", List.of(Map.of("exerciseId", "bench_press", "sets", 3, "reps", Map.of("min", 6, "max", 10)))),
                Map.of("name", "Lower", "weekday", "THURSDAY", "exercises", List.of(Map.of("exerciseId", "squat", "sets", 3, "reps", Map.of("min", 6, "max", 10)))))))).hasStatusOk();
        Map<String, Object> ownProgram = map(send(own, "GET", "/v1/program", null));
        assertThat(send(own, "POST", "/v1/program/days", Map.of("weekday", "TUESDAY"))).hasStatus(409);
        assertThat(map(send(own, "GET", "/v1/program", null))).isEqualTo(ownProgram);

        // Three to six days: the user adds the day in Edit (ADR-073 Ek 9).
        List<String> week = List.of("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY");
        for (int size = 3; size <= 6; size++) {
            AccountId other = TestSessions.newAccount();
            assertThat(send(other, "POST", "/v1/program/generate", Map.of("trainingDays", week.subList(0, size)))).hasStatusOk();
            Map<String, Object> before = map(send(other, "GET", "/v1/program", null));
            assertThat(send(other, "POST", "/v1/program/days", Map.of("weekday", "SUNDAY"))).as(size + " days").hasStatus(409);
            assertThat(map(send(other, "GET", "/v1/program", null))).as(size + " days: nothing changed").isEqualTo(before);
        }
    }

    @Test
    void aDayNeedsAWeekdayAndAProgram() throws Exception {
        AccountId account = TestSessions.newAccount();
        assertThat(send(account, "POST", "/v1/program/days", Map.of("weekday", "TUESDAY"))).hasStatus(404);
        twoDays(account);

        assertThat(send(account, "POST", "/v1/program/days", Map.of())).hasStatus(400);
        assertThat(send(account, "POST", "/v1/program/days", Map.of("weekday", "FUNDAY"))).hasStatus(400);
    }

    /** A workout of the program day begun at {@code startedAt} with one working set of the move; its id. */
    private String workout(AccountId account, String startedAt, Object programDayId, String exercise, int kg) throws Exception {
        MvcTestResult started = send(account, "POST", "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", startedAt,
                "programDayId", programDayId));
        assertThat(started).hasStatus(201);
        String workout = (String) JSON.readValue(started.getResponse().getContentAsString(), Map.class).get("id");
        assertThat(send(account, "POST", "/v1/workouts/" + workout + "/sets", Map.of("clientId", UUID.randomUUID(), "exerciseId", exercise,
                "setType", "WORKING", "loadKg", kg, "reps", 9, "rir", 1))).hasStatus(201);
        return workout;
    }

    private static Map<String, Object> session(Map<String, Object> program, Object day) {
        return sessions(program).stream().filter(one -> day.equals(one.get("programDayId"))).findFirst().orElseThrow();
    }

    /** The generated program for Monday, Wednesday, Friday and Saturday, with bench presses started at 80 kg. */
    private Map<String, Object> generated(AccountId account) throws Exception {
        assertThat(send(account, "POST", "/v1/program/generate", Map.of("trainingDays", List.of("MONDAY", "WEDNESDAY", "FRIDAY", "SATURDAY"))))
                .hasStatusOk();
        return map(send(account, "PUT", "/v1/program/starting-weights", Map.of("weights", List.of(Map.of("exerciseId", "bench_press", "kg", 80)))));
    }

    /** The generated program for Monday and Friday, with bench presses started at 80 kg and squats at 100: the program a day is added to. */
    private Map<String, Object> twoDays(AccountId account) throws Exception {
        assertThat(send(account, "POST", "/v1/program/generate", Map.of("trainingDays", List.of("MONDAY", "FRIDAY")))).hasStatusOk();
        return map(send(account, "PUT", "/v1/program/starting-weights", Map.of("weights", List.of(Map.of("exerciseId", "bench_press", "kg", 80),
                Map.of("exerciseId", "squat", "kg", 100)))));
    }

    /** The program as an edit that leaves it as it is, every day and move by its id, changed by {@code change}. */
    private static Map<String, Object> edit(Map<String, Object> program, UnaryOperator<List<Map<String, Object>>> change) {
        List<Map<String, Object>> days = new ArrayList<>();
        for (Map<String, Object> day : days(program)) {
            Map<String, Object> edited = new HashMap<>(Map.of("id", day.get("id")));
            if (day.get("weekday") != null) {
                edited.put("weekday", day.get("weekday"));
            }
            List<Map<String, Object>> moves = new ArrayList<>();
            for (Object raw : (List<?>) day.get("exercises")) {
                Map<?, ?> move = (Map<?, ?>) raw;
                moves.add(new HashMap<>(Map.of("id", move.get("id"), "exerciseId", move.get("exerciseId"), "sets", move.get("baseSets"), "reps",
                        move.get("reps"))));
            }
            edited.put("exercises", moves);
            days.add(edited);
        }
        return Map.of("days", change.apply(days));
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> exercises(Map<String, Object> day) {
        return (List<Map<String, Object>>) day.get("exercises");
    }

    private static void setsOf(Map<String, Object> day, String exercise, int sets) {
        exercises(day).stream().filter(move -> exercise.equals(move.get("exerciseId"))).findFirst().orElseThrow().put("sets", sets);
    }

    private static void removeMove(Map<String, Object> day, int at) {
        exercises(day).remove(at);
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> edits(Map<String, Object> program) {
        return (List<Map<String, Object>>) ((Map<?, ?>) program.get("review")).get("edits");
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> applied(Map<String, Object> program) {
        return (List<Map<String, Object>>) ((Map<?, ?>) program.get("review")).get("applied");
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> sessions(Map<String, Object> program) {
        return (List<Map<String, Object>>) program.get("week");
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> days(Map<String, Object> program) {
        return (List<Map<String, Object>>) program.get("days");
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
            case "PATCH" -> mvc.patch();
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
    private static Map<String, Object> map(Object value) {
        return (Map<String, Object>) value;
    }

    private static Map<String, Object> map(MvcTestResult result) throws Exception {
        assertThat(result).hasStatusOk();
        return map(JSON.readValue(result.getResponse().getContentAsString(), Map.class));
    }
}
