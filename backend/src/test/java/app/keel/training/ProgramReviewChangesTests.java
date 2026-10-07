package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import app.keel.engine.ProgramReview;
import app.keel.engine.RepositoryParameters;
import app.keel.engine.Sex;
import app.keel.engine.SourceTag;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.OptionalInt;
import java.util.UUID;
import java.util.function.UnaryOperator;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

/**
 * The review's changes on a stored program (K-956, ADR-073 #2-#4), without a database: what the engine's diff changes, and
 * only that, keeping each move's row (id) and next target, the program's source and its days; the picks applied in the
 * review's order, one the earlier ones fixed left out; an undo putting back the program before a change and applying the
 * later ones again. Thresholds come from the parameter files; the catalog is the repository's.
 */
class ProgramReviewChangesTests {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static final int RIR = P.wholeNumber(ParameterKey.TARGET_RIR_MAX);
    private static final int C_MIN = P.wholeNumber(ParameterKey.REP_RANGE_COMPOUND_MIN);
    private static final int C_MAX = P.wholeNumber(ParameterKey.REP_RANGE_COMPOUND_MAX);
    private static final int I_MIN = P.wholeNumber(ParameterKey.REP_RANGE_ISOLATION_MIN);
    private static final int I_MAX = P.wholeNumber(ParameterKey.REP_RANGE_ISOLATION_MAX);
    private static final Instant SESSION = Instant.parse("2026-10-05T17:00:00Z");
    private static ExerciseCatalog catalog;

    @BeforeAll
    static void load() throws IOException {
        catalog = ExerciseCatalogTestData.catalog();
    }

    // ── fixture ──────────────────────────────────────────────────────────────────────────────────────────────────

    static ProgramStore.PlannedExercise compound(String exercise, int sets) {
        return new ProgramStore.PlannedExercise(exercise, sets, C_MIN, C_MAX, RIR, null, null, null, UUID.randomUUID(), null, false);
    }

    static ProgramStore.PlannedExercise isolation(String exercise, int sets) {
        return new ProgramStore.PlannedExercise(exercise, sets, I_MIN, I_MAX, RIR, null, null, null, UUID.randomUUID(), null, false);
    }

    /** A move with a target a session set: {@code kg} for {@code reps}, from the session before. */
    static ProgramStore.PlannedExercise targeted(ProgramStore.PlannedExercise move, String kg, int reps) {
        return new ProgramStore.PlannedExercise(move.exerciseId(), move.sets(), move.repMin(), move.repMax(), move.targetRir(), new BigDecimal(kg),
                reps, new BigDecimal(kg), move.id(), SESSION, false);
    }

    static ProgramStore.Day day(String name, DayOfWeek weekday, ProgramStore.PlannedExercise... moves) {
        return new ProgramStore.Day(UUID.randomUUID(), null, name, weekday, List.of(moves));
    }

    /**
     * The user's own upper/lower week (the engine's fixture of a program inside every rule), with chest over weekly_sets_max
     * (16: 9 + 7), the squat at 3-5 and hamstrings under weekly_sets_min (the RDL's 2 sets alone). Bench and squat have targets.
     */
    static ProgramStore.Program own() {
        return new ProgramStore.Program(UUID.randomUUID(), ProgramStore.Source.OWN, List.of(
                day("Upper A", DayOfWeek.MONDAY, targeted(compound("bench_press", 5), "80", 7), compound("incline_dumbbell_press", 4),
                        compound("barbell_row", 3), compound("overhead_press", 2), isolation("barbell_curl", 3), isolation("triceps_pushdown", 3)),
                day("Lower A", DayOfWeek.TUESDAY, targeted(withReps(compound("squat", 3), 3, 5), "140", 3), compound("romanian_deadlift", 2),
                        isolation("standing_calf_raise", 3)),
                day("Upper B", DayOfWeek.THURSDAY, compound("dumbbell_bench_press", 4), isolation("cable_fly", 3), compound("seated_row", 3),
                        compound("dumbbell_shoulder_press", 2), isolation("dumbbell_curl", 3), isolation("overhead_triceps_extension", 3)),
                day("Lower B", DayOfWeek.FRIDAY, compound("leg_press", 3), compound("hip_thrust", 2), isolation("seated_calf_raise", 3))));
    }

    static ProgramStore.PlannedExercise withReps(ProgramStore.PlannedExercise move, int min, int max) {
        return new ProgramStore.PlannedExercise(move.exerciseId(), move.sets(), min, max, move.targetRir(), move.nextLoadKg(), move.nextReps(),
                move.lastLoadKg(), move.id(), move.nextFrom(), move.nextRackEnds());
    }

    static ProgramStore.Program change(ProgramStore.Program program, int day, UnaryOperator<List<ProgramStore.PlannedExercise>> moves) {
        List<ProgramStore.Day> days = new ArrayList<>(program.days());
        ProgramStore.Day old = days.get(day);
        days.set(day, new ProgramStore.Day(old.id(), old.nameKey(), old.name(), old.weekday(), moves.apply(new ArrayList<>(old.exercises()))));
        return new ProgramStore.Program(program.id(), program.source(), days);
    }

    /** Each day's moves as "exercise sets min-max": the program as the review reads it. */
    static List<List<String>> shape(ProgramStore.Program program) {
        return program.days().stream().map(day -> day.exercises().stream()
                .map(move -> move.exerciseId() + " " + move.sets() + " " + move.repMin() + "-" + move.repMax()).toList()).toList();
    }

    static Map<UUID, ProgramStore.PlannedExercise> byId(ProgramStore.Program program) {
        Map<UUID, ProgramStore.PlannedExercise> moves = new HashMap<>();
        program.days().forEach(day -> day.exercises().forEach(move -> moves.put(move.id(), move)));
        return moves;
    }

    static int weekly(ProgramStore.Program program, String muscle) {
        return program.days().stream().flatMap(day -> day.exercises().stream())
                .filter(move -> catalog.find(move.exerciseId()).orElseThrow().muscles().getFirst().equals(muscle))
                .mapToInt(ProgramStore.PlannedExercise::sets).sum();
    }

    static List<String> ids(ProgramReviews.Outcome outcome) {
        return outcome.steps().stream().map(step -> step.suggestion().id()).toList();
    }

    // ── the review as the app gets it ────────────────────────────────────────────────────────────────────────────

    @Test
    void aSuggestionsIdIsItsFindingAndWhatItIsAboutAndItCarriesTheKindOfSourceNotThePath() {
        List<ProgramReviews.Suggestion> suggestions = ProgramReviews.suggestions(own(), catalog, P);

        assertThat(suggestions).extracting(ProgramReviews.Suggestion::id)
                .containsExactly("TOO_MANY_SETS:chest", "TOO_FEW_SETS:hamstrings", "REP_RANGE:squat");
        ProgramReviews.Suggestion chest = suggestions.getFirst();
        assertThat(chest.finding()).isEqualTo(ProgramReview.Finding.TOO_MANY_SETS);
        assertThat(chest.muscle()).isEqualTo("chest");
        assertThat(chest.exerciseId()).isNull();
        assertThat(chest.numbers()).isEqualTo(Map.of("from", 16, "to", P.wholeNumber(ParameterKey.WEEKLY_SETS_TRIM_TO)));
        assertThat(chest.copyKey()).isEqualTo("review.too_many_sets");
        assertThat(chest.reason()).isEqualTo(new ProgramReviews.Reason("program_weekly_sets_max", new ProgramReviews.SourceView(SourceTag.EXPERIENCE)));
        assertThat(suggestions.getLast().exerciseId()).isEqualTo("squat");
        assertThat(suggestions.getLast().muscle()).isNull();
    }

    @Test
    void theReviewIdNamesTheMovesSetsRangesAndDayOrderNotNamesWeekdaysRowsOrTargets() {
        ProgramStore.Program program = own();
        ProgramStore.Program renamed = new ProgramStore.Program(UUID.randomUUID(), ProgramStore.Source.GENERATED, program.days().stream()
                .map(day -> new ProgramStore.Day(UUID.randomUUID(), null, day.name() + "!", null, day.exercises().stream()
                        .map(move -> new ProgramStore.PlannedExercise(move.exerciseId(), move.sets(), move.repMin(), move.repMax(), move.targetRir())).toList()))
                .toList());

        assertThat(ProgramReviews.reviewId(renamed)).isEqualTo(ProgramReviews.reviewId(program));
        List<ProgramStore.Program> others = List.of(
                change(program, 0, moves -> { moves.set(0, compound("bench_press", 4)); return moves; }),
                change(program, 1, moves -> { moves.set(0, withReps(moves.getFirst(), 4, 6)); return moves; }),
                change(program, 2, moves -> { moves.add(moves.removeFirst()); return moves; }),
                change(program, 2, moves -> { moves.set(1, isolation("pec_deck", 3)); return moves; }),
                new ProgramStore.Program(program.id(), program.source(), List.of(program.days().get(1), program.days().get(0),
                        program.days().get(2), program.days().get(3))));
        assertThat(others).extracting(ProgramReviews::reviewId).doesNotContain(ProgramReviews.reviewId(program)).doesNotHaveDuplicates();
    }

    @Test
    void aMuscleIsToppedUpWithTheUsersOwnIsolationMoveElseTheCatalogsFirst() {
        // No hamstring isolation move in the program: the catalog's first by id (lying before seated). With a seated leg
        // curl of the user's own, that one.
        ProgramStore.Program program = own();
        ProgramReviews.Outcome catalogs = ProgramReviews.apply(program, List.of("TOO_FEW_SETS:hamstrings"), catalog, P);
        ProgramStore.Program withOwnCurl = change(program, 3, moves -> { moves.add(isolation("seated_leg_curl", 1)); return moves; });
        ProgramReviews.Outcome users = ProgramReviews.apply(withOwnCurl, List.of("TOO_FEW_SETS:hamstrings"), catalog, P);

        assertThat(added(program, catalogs.program())).extracting(ProgramStore.PlannedExercise::exerciseId).containsExactly("lying_leg_curl");
        assertThat(shape(users.program()).stream().flatMap(List::stream)).noneMatch(move -> move.startsWith("lying_leg_curl"));
        assertThat(weekly(users.program(), "hamstrings")).isEqualTo(P.wholeNumber(ParameterKey.WEEKLY_SETS_MIN));
    }

    @Test
    void aProgramWithAMoveTheCatalogDoesNotKnowIsNotReviewed() {
        // Its muscles can't be counted, so no count about them is trusted.
        ProgramStore.Program program = change(own(), 3, moves -> { moves.add(isolation("deadlift_of_the_moon", 3)); return moves; });

        assertThat(ProgramReviews.suggestions(program, catalog, P)).isEmpty();
        assertThat(ProgramReviews.apply(program, List.of("TOO_MANY_SETS:chest"), catalog, P).steps()).isEmpty();
    }

    // ── apply ────────────────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void aChangeTouchesOnlyWhatItsDiffSaysAndEveryMoveKeepsItsRowAndTarget() {
        ProgramStore.Program program = own();

        ProgramReviews.Outcome outcome = ProgramReviews.apply(program, List.of("TOO_MANY_SETS:chest"), catalog, P);

        ProgramStore.Program after = outcome.program();
        assertThat(ids(outcome)).containsExactly("TOO_MANY_SETS:chest");
        assertThat(outcome.steps().getFirst().before()).isEqualTo(program);
        assertThat(outcome.steps().getFirst().after()).isEqualTo(after);
        assertThat(weekly(after, "chest")).isEqualTo(P.wholeNumber(ParameterKey.WEEKLY_SETS_TRIM_TO));
        assertThat(after.id()).isEqualTo(program.id());
        assertThat(after.source()).isEqualTo(ProgramStore.Source.OWN);
        assertThat(after.days()).extracting(ProgramStore.Day::id, ProgramStore.Day::name, ProgramStore.Day::weekday).containsExactlyElementsOf(
                program.days().stream().map(day -> org.assertj.core.groups.Tuple.tuple(day.id(), day.name(), day.weekday())).toList());
        Map<UUID, ProgramStore.PlannedExercise> before = byId(program);
        for (ProgramStore.PlannedExercise move : byId(after).values()) {
            ProgramStore.PlannedExercise was = before.get(move.id());
            assertThat(was).as(move.exerciseId() + " kept its row").isNotNull();
            boolean chest = catalog.find(move.exerciseId()).orElseThrow().muscles().getFirst().equals("chest");
            assertThat(move).as(move.exerciseId()).isEqualTo(chest ? sets(was, move.sets()) : was);
        }
        assertThat(byId(after).get(program.days().getFirst().exercises().getFirst().id()).nextLoadKg()).isEqualByComparingTo("80");
    }

    @Test
    void aMoveWhoseRepRangeChangesLosesItsTargetForTheOldRange() {
        ProgramStore.Program program = own();
        ProgramStore.PlannedExercise squat = program.days().get(1).exercises().getFirst();

        ProgramStore.Program after = ProgramReviews.apply(program, List.of("REP_RANGE:squat"), catalog, P).program();

        assertThat(byId(after).get(squat.id())).isEqualTo(new ProgramStore.PlannedExercise("squat", squat.sets(), C_MIN, C_MAX, RIR, null, null,
                null, squat.id(), null, false));
    }

    @Test
    void anAddedMoveIsANewRowWithTheWorkSetRirAndNoTarget() {
        ProgramStore.Program program = own();

        List<ProgramStore.PlannedExercise> added = added(program, ProgramReviews.apply(program, List.of("TOO_FEW_SETS:hamstrings"), catalog, P).program());

        assertThat(added).singleElement().satisfies(move -> {
            assertThat(move.id()).isNotNull();
            assertThat(move.targetRir()).isEqualTo(RIR);
            assertThat(move.nextLoadKg()).isNull();
            assertThat(List.of(move.repMin(), move.repMax())).containsExactly(I_MIN, I_MAX);
        });
    }

    @Test
    void picksApplyInTheGivenOrderAndOneAnEarlierChangeFixedIsLeftOut() {
        // Biceps on Upper A only, at weekly_sets_min (4) and under arm_weekly_sets_min (6): too few and once a week. Topping
        // up puts the missing sets on another day, which also trains it twice: "once a week" is gone before its turn.
        ProgramStore.Program program = change(change(own(), 0, moves -> {
            moves.set(4, isolation("barbell_curl", P.wholeNumber(ParameterKey.WEEKLY_SETS_MIN)));
            return moves;
        }), 2, moves -> { moves.remove(4); return moves; });
        assertThat(ProgramReviews.suggestions(program, catalog, P)).extracting(ProgramReviews.Suggestion::id).contains("TOO_FEW_SETS:biceps");

        ProgramReviews.Outcome outcome = ProgramReviews.apply(program, List.of("TOO_FEW_SETS:biceps", "ONCE_A_WEEK:biceps"), catalog, P);

        assertThat(ids(outcome)).containsExactly("TOO_FEW_SETS:biceps");
        assertThat(outcome.steps().getFirst().suggestion().finding()).isEqualTo(ProgramReview.Finding.TOO_FEW_SETS);
    }

    @Test
    void eachChangeStartsFromTheOneBefore() {
        ProgramStore.Program program = own();

        ProgramReviews.Outcome outcome = ProgramReviews.apply(program, List.of("TOO_MANY_SETS:chest", "TOO_FEW_SETS:hamstrings", "REP_RANGE:squat"),
                catalog, P);

        assertThat(ids(outcome)).containsExactly("TOO_MANY_SETS:chest", "TOO_FEW_SETS:hamstrings", "REP_RANGE:squat");
        assertThat(outcome.steps().get(1).before()).isEqualTo(outcome.steps().get(0).after());
        assertThat(outcome.steps().get(2).before()).isEqualTo(outcome.steps().get(1).after());
        assertThat(ProgramReviews.suggestions(outcome.program(), catalog, P)).extracting(ProgramReviews.Suggestion::id)
                .doesNotContain("TOO_MANY_SETS:chest", "TOO_FEW_SETS:hamstrings", "REP_RANGE:squat");
    }

    // ── undo ─────────────────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void undoingTheLastChangePutsBackTheProgramBeforeItWithTheTargetsSetSince() {
        ProgramReviews.Outcome applied = ProgramReviews.apply(own(), List.of("TOO_MANY_SETS:chest", "TOO_FEW_SETS:hamstrings"), catalog, P);
        ProgramStore.Program current = sessionOnTheBench(applied.program(), "82.5");

        ProgramReviews.Outcome undone = ProgramReviews.undo(applied.steps(), OptionalInt.of(1), current, catalog, P);

        assertThat(undone.steps()).isEmpty();
        assertThat(shape(undone.program())).isEqualTo(shape(applied.steps().get(1).before()));
        assertThat(undone.program().days()).extracting(ProgramStore.Day::id).isEqualTo(current.days().stream().map(ProgramStore.Day::id).toList());
        assertThat(bench(undone.program()).nextLoadKg()).isEqualByComparingTo("82.5");
    }

    @Test
    void undoingAnEarlierChangeAppliesTheLaterOnesAgain() {
        ProgramStore.Program program = own();
        ProgramReviews.Outcome applied = ProgramReviews.apply(program, List.of("TOO_MANY_SETS:chest", "TOO_FEW_SETS:hamstrings"), catalog, P);
        ProgramStore.Program current = sessionOnTheBench(applied.program(), "82.5");

        ProgramReviews.Outcome undone = ProgramReviews.undo(applied.steps(), OptionalInt.of(0), current, catalog, P);

        assertThat(ids(undone)).containsExactly("TOO_FEW_SETS:hamstrings");
        assertThat(shape(undone.program())).isEqualTo(shape(ProgramReviews.apply(program, List.of("TOO_FEW_SETS:hamstrings"), catalog, P).program()));
        assertThat(weekly(undone.program(), "chest")).isEqualTo(weekly(program, "chest"));
        assertThat(bench(undone.program()).nextLoadKg()).isEqualByComparingTo("82.5");
        // The leg curl the later change added again is the same row: its target, had a session set one, would stay.
        assertThat(added(program, undone.program())).extracting(ProgramStore.PlannedExercise::id)
                .containsExactlyElementsOf(added(program, applied.program()).stream().map(ProgramStore.PlannedExercise::id).toList());
    }

    @Test
    void undoingTheOnlyChangePutsBackTheProgramAsItWas() {
        ProgramStore.Program program = own();
        ProgramReviews.Outcome applied = ProgramReviews.apply(program, List.of("REP_RANGE:squat"), catalog, P);

        ProgramReviews.Outcome undone = ProgramReviews.undo(applied.steps(), OptionalInt.of(0), applied.program(), catalog, P);

        // The squat's target was for 3-5; back at 3-5 it is its target again.
        assertThat(undone.program()).isEqualTo(program);
    }

    @Test
    void undoingEveryChangePutsBackTheProgramBeforeTheFirstAndAppliesNoneAgain() {
        ProgramStore.Program program = own();
        ProgramReviews.Outcome applied = ProgramReviews.apply(program, List.of("TOO_MANY_SETS:chest", "TOO_FEW_SETS:hamstrings", "REP_RANGE:squat"),
                catalog, P);
        ProgramStore.Program current = sessionOnTheBench(applied.program(), "82.5");

        ProgramReviews.Outcome undone = ProgramReviews.undo(applied.steps(), OptionalInt.empty(), current, catalog, P);

        assertThat(undone.steps()).isEmpty();
        assertThat(shape(undone.program())).isEqualTo(shape(program));
        assertThat(bench(undone.program()).nextLoadKg()).isEqualByComparingTo("82.5");
    }

    @Test
    void aSnapshotReadsBackAsItWasWritten() {
        JsonMapper json = JsonMapper.builder().build();
        ProgramStore.Program program = own();

        assertThat(json.readValue(json.writeValueAsString(program), ProgramStore.Program.class)).isEqualTo(program);
        ProgramReviews.Suggestion suggestion = ProgramReviews.suggestions(program, catalog, P).getFirst();
        assertThat(json.readValue(json.writeValueAsString(suggestion), ProgramReviews.Suggestion.class)).isEqualTo(suggestion);
    }

    // ── helpers ──────────────────────────────────────────────────────────────────────────────────────────────────

    private static ProgramStore.PlannedExercise sets(ProgramStore.PlannedExercise move, int sets) {
        return new ProgramStore.PlannedExercise(move.exerciseId(), sets, move.repMin(), move.repMax(), move.targetRir(), move.nextLoadKg(),
                move.nextReps(), move.lastLoadKg(), move.id(), move.nextFrom(), move.nextRackEnds());
    }

    /** The moves of {@code after} that are not rows of {@code before}. */
    private static List<ProgramStore.PlannedExercise> added(ProgramStore.Program before, ProgramStore.Program after) {
        Map<UUID, ProgramStore.PlannedExercise> was = byId(before);
        return after.days().stream().flatMap(day -> day.exercises().stream()).filter(move -> !was.containsKey(move.id())).toList();
    }

    private static ProgramStore.PlannedExercise bench(ProgramStore.Program program) {
        return program.days().stream().flatMap(day -> day.exercises().stream()).filter(move -> move.exerciseId().equals("bench_press"))
                .findFirst().orElseThrow();
    }

    /** A session after the changes set the bench's next target to {@code kg} × 6. */
    private static ProgramStore.Program sessionOnTheBench(ProgramStore.Program program, String kg) {
        UUID bench = bench(program).id();
        return new ProgramStore.Program(program.id(), program.source(), program.days().stream().map(day -> new ProgramStore.Day(day.id(), day.nameKey(),
                day.name(), day.weekday(), day.exercises().stream().map(move -> Objects.equals(move.id(), bench)
                        ? new ProgramStore.PlannedExercise(move.exerciseId(), move.sets(), move.repMin(), move.repMax(), move.targetRir(),
                                new BigDecimal(kg), 6, new BigDecimal("80"), move.id(), SESSION.plusSeconds(86_400), false)
                        : move).toList())).toList());
    }
}
