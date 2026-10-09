package app.keel.training;

import static app.keel.training.ProgramReviewChangesTests.compound;
import static app.keel.training.ProgramReviewChangesTests.isolation;
import static app.keel.training.ProgramReviewChangesTests.own;
import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import app.keel.engine.RepositoryParameters;
import app.keel.engine.Sex;
import java.io.IOException;
import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.List;
import java.util.OptionalInt;
import java.util.UUID;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * The program edited by its day and move ids (K-995, ADR-073 #4, Ek 7), without a database: each move keeps its row and
 * target while it is the same move with the same range; days keep their ids and names; an id the program does not have is
 * a conflict; the edit is a change of the log an undo puts back, and a later edit that no longer applies goes with it.
 */
class ProgramEditTests {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static final int RIR = P.wholeNumber(ParameterKey.TARGET_RIR_MAX);
    private static ExerciseCatalog catalog;

    @BeforeAll
    static void load() throws IOException {
        catalog = ExerciseCatalogTestData.catalog();
    }

    @Test
    void aMoveLeftAsItIsKeepsItsRowAndTargetAndOtherSetsKeepThemToo() {
        ProgramStore.Program program = own();
        ProgramStore.Day upper = program.days().getFirst();
        ProgramStore.PlannedExercise bench = upper.exercises().getFirst();
        List<ProgramEdits.Day> edit = asIs(program);
        edit.set(0, withMove(edit.getFirst(), 0, new ProgramEdits.Move(bench.id(), "bench_press", 3, bench.repMin(), bench.repMax())));

        List<ProgramStore.Day> edited = ProgramEdits.edited(program, edit, RIR).orElseThrow();

        ProgramStore.PlannedExercise after = edited.getFirst().exercises().getFirst();
        assertThat(after.id()).isEqualTo(bench.id());
        assertThat(after.sets()).isEqualTo(3);
        assertThat(after.nextLoadKg()).isEqualByComparingTo("80");
        assertThat(edited.getFirst().exercises().subList(1, upper.exercises().size())).isEqualTo(upper.exercises().subList(1, upper.exercises().size()));
        assertThat(edited.subList(1, edited.size())).isEqualTo(program.days().subList(1, program.days().size()));
    }

    @Test
    void anotherRangeKeepsTheRowWithoutItsTargetAndAnotherMoveIsANewRow() {
        ProgramStore.Program program = own();
        ProgramStore.PlannedExercise bench = program.days().getFirst().exercises().getFirst();
        ProgramStore.PlannedExercise squat = program.days().get(1).exercises().getFirst();
        List<ProgramEdits.Day> edit = asIs(program);
        edit.set(0, withMove(edit.getFirst(), 0, new ProgramEdits.Move(bench.id(), "bench_press", bench.sets(), 5, 5)));
        edit.set(1, withMove(edit.get(1), 0, new ProgramEdits.Move(squat.id(), "hack_squat", squat.sets(), squat.repMin(), squat.repMax())));

        List<ProgramStore.Day> edited = ProgramEdits.edited(program, edit, RIR).orElseThrow();

        ProgramStore.PlannedExercise fixed = edited.getFirst().exercises().getFirst();
        assertThat(fixed.id()).isEqualTo(bench.id());
        assertThat(List.of(fixed.repMin(), fixed.repMax())).containsExactly(5, 5);
        assertThat(fixed.nextLoadKg()).as("the target was for the old range").isNull();
        ProgramStore.PlannedExercise hack = edited.get(1).exercises().getFirst();
        assertThat(hack.exerciseId()).isEqualTo("hack_squat");
        assertThat(hack.id()).as("a new row: the new move has its own history").isNull();
        assertThat(hack.nextLoadKg()).isNull();
        assertThat(hack.targetRir()).isEqualTo(squat.targetRir());
    }

    @Test
    void aMoveTakenToAnotherDayKeepsItsRowAndTargetAndANewMoveIsANewRow() {
        ProgramStore.Program program = own();
        ProgramStore.PlannedExercise bench = program.days().getFirst().exercises().getFirst();
        List<ProgramEdits.Day> edit = asIs(program);
        edit.set(0, withoutMove(edit.getFirst(), 0));
        List<ProgramEdits.Move> lower = new ArrayList<>(edit.get(1).moves());
        lower.add(new ProgramEdits.Move(bench.id(), "bench_press", bench.sets(), bench.repMin(), bench.repMax()));
        lower.add(new ProgramEdits.Move(null, "lying_leg_curl", 3, 8, 12));
        edit.set(1, new ProgramEdits.Day(edit.get(1).id(), null, edit.get(1).weekday(), lower));

        List<ProgramStore.Day> edited = ProgramEdits.edited(program, edit, RIR).orElseThrow();

        assertThat(edited.getFirst().exercises()).noneMatch(move -> bench.id().equals(move.id()));
        ProgramStore.PlannedExercise moved = edited.get(1).exercises().get(lower.size() - 2);
        assertThat(moved.id()).isEqualTo(bench.id());
        assertThat(moved.nextLoadKg()).isEqualByComparingTo("80");
        ProgramStore.PlannedExercise added = edited.get(1).exercises().getLast();
        assertThat(added.id()).isNull();
        assertThat(added.targetRir()).isEqualTo(RIR);
        assertThat(added.nextLoadKg()).isNull();
    }

    @Test
    void daysKeepTheirIdsAndNamesANameRenamesANewDayIsNewAndOneLeftOutGoes() {
        ProgramStore.Program generated = new ProgramStore.Program(UUID.randomUUID(), ProgramStore.Source.GENERATED, List.of(
                new ProgramStore.Day(UUID.randomUUID(), "programDays.upper_a.name", null, DayOfWeek.MONDAY, List.of(compound("bench_press", 3))),
                new ProgramStore.Day(UUID.randomUUID(), "programDays.lower_a.name", null, DayOfWeek.TUESDAY, List.of(compound("squat", 3))),
                new ProgramStore.Day(UUID.randomUUID(), "programDays.upper_b.name", null, DayOfWeek.THURSDAY, List.of(isolation("cable_fly", 3)))));
        List<ProgramEdits.Day> edit = asIs(generated);
        ProgramEdits.Day lower = edit.get(1);
        List<ProgramEdits.Day> days = List.of(
                new ProgramEdits.Day(edit.getFirst().id(), null, DayOfWeek.WEDNESDAY, edit.getFirst().moves()),
                new ProgramEdits.Day(lower.id(), "Legs", lower.weekday(), lower.moves()),
                new ProgramEdits.Day(null, "Arms", DayOfWeek.FRIDAY, List.of(new ProgramEdits.Move(null, "barbell_curl", 3, 8, 12))));

        List<ProgramStore.Day> edited = ProgramEdits.edited(generated, days, RIR).orElseThrow();

        assertThat(edited).extracting(ProgramStore.Day::id).containsExactly(generated.days().getFirst().id(), generated.days().get(1).id(), null);
        assertThat(edited).extracting(ProgramStore.Day::nameKey).containsExactly("programDays.upper_a.name", null, null);
        assertThat(edited).extracting(ProgramStore.Day::name).containsExactly(null, "Legs", "Arms");
        assertThat(edited).extracting(ProgramStore.Day::weekday).containsExactly(DayOfWeek.WEDNESDAY, DayOfWeek.TUESDAY, DayOfWeek.FRIDAY);
    }

    @Test
    void aDayOnAnotherWeekdayOrLeftOutReLaysItsWeek() {
        ProgramStore.Program program = own();
        List<ProgramEdits.Day> edit = asIs(program);
        edit.set(0, new ProgramEdits.Day(edit.getFirst().id(), "Push", DayOfWeek.WEDNESDAY, edit.getFirst().moves()));
        edit.set(1, new ProgramEdits.Day(edit.get(1).id(), "Legs", edit.get(1).weekday(), edit.get(1).moves()));
        edit.remove(3);
        ProgramStore.Program after = new ProgramStore.Program(program.id(), program.source(), ProgramEdits.edited(program, edit, RIR).orElseThrow());

        // Renamed on its weekday, a day keeps this week's change; moved to Wednesday or gone, it re-lays.
        assertThat(ProgramEdits.relaid(program, after)).containsExactlyInAnyOrder(program.days().getFirst().id(), program.days().get(3).id());
    }

    @Test
    void anIdTheProgramDoesNotHaveOrOneGivenTwiceIsAConflict() {
        ProgramStore.Program program = own();
        List<ProgramEdits.Day> unknownDay = asIs(program);
        unknownDay.set(0, new ProgramEdits.Day(UUID.randomUUID(), null, unknownDay.getFirst().weekday(), unknownDay.getFirst().moves()));
        List<ProgramEdits.Day> unknownMove = asIs(program);
        unknownMove.set(0, withMove(unknownMove.getFirst(), 0, new ProgramEdits.Move(UUID.randomUUID(), "bench_press", 3, 6, 10)));
        List<ProgramEdits.Day> twice = asIs(program);
        twice.set(1, new ProgramEdits.Day(twice.getFirst().id(), null, twice.get(1).weekday(), twice.get(1).moves()));
        List<ProgramEdits.Day> moveTwice = asIs(program);
        List<ProgramEdits.Move> doubled = new ArrayList<>(moveTwice.get(1).moves());
        doubled.add(moveTwice.getFirst().moves().getFirst());
        moveTwice.set(1, new ProgramEdits.Day(moveTwice.get(1).id(), null, moveTwice.get(1).weekday(), doubled));

        assertThat(ProgramEdits.edited(program, unknownDay, RIR)).isEmpty();
        assertThat(ProgramEdits.edited(program, unknownMove, RIR)).isEmpty();
        assertThat(ProgramEdits.edited(program, twice, RIR)).isEmpty();
        assertThat(ProgramEdits.edited(program, moveTwice, RIR)).isEmpty();
        // As it is, the program is unchanged.
        assertThat(ProgramEdits.edited(program, asIs(program), RIR)).contains(program.days());
    }

    @Test
    void undoingAnEditPutsBackTheProgramBeforeItAndAnEarlierUndoTakesALaterEditWithIt() {
        ProgramStore.Program program = own();
        ProgramReviews.Outcome reviewed = ProgramReviews.apply(program, List.of("REP_RANGE:squat"), catalog, P);
        ProgramStore.Program before = reviewed.program();
        List<ProgramEdits.Day> edit = asIs(before);
        edit.set(0, withoutMove(edit.getFirst(), 1));
        ProgramStore.Program after = new ProgramStore.Program(before.id(), before.source(), ProgramEdits.edited(before, edit, RIR).orElseThrow());
        List<ProgramReviews.Step> log = List.of(reviewed.steps().getFirst(), ProgramReviews.Step.edit(before, after));
        assertThat(log.getLast().kind()).isEqualTo(ProgramReviews.Kind.EDIT);
        assertThat(log.getFirst().kind()).isEqualTo(ProgramReviews.Kind.REVIEW);

        ProgramReviews.Outcome editUndone = ProgramReviews.undo(log, OptionalInt.of(1), after, catalog, P);
        ProgramReviews.Outcome reviewUndone = ProgramReviews.undo(log, OptionalInt.of(0), after, catalog, P);

        assertThat(editUndone.program()).isEqualTo(before);
        assertThat(editUndone.steps()).isEmpty();
        // The edit was made to the reviewed program: without the review's change it no longer applies, and is named.
        assertThat(ProgramReviewChangesTests.shape(reviewUndone.program())).isEqualTo(ProgramReviewChangesTests.shape(program));
        assertThat(reviewUndone.steps()).isEmpty();
        assertThat(reviewUndone.skipped()).containsExactly(0);
    }

    /** The edit that leaves the program as it is: every day and move by its id. */
    private static List<ProgramEdits.Day> asIs(ProgramStore.Program program) {
        return new ArrayList<>(program.days().stream().map(day -> new ProgramEdits.Day(day.id(), null, day.weekday(), day.exercises().stream()
                .map(move -> new ProgramEdits.Move(move.id(), move.exerciseId(), move.sets(), move.repMin(), move.repMax())).toList())).toList());
    }

    private static ProgramEdits.Day withMove(ProgramEdits.Day day, int at, ProgramEdits.Move move) {
        List<ProgramEdits.Move> moves = new ArrayList<>(day.moves());
        moves.set(at, move);
        return new ProgramEdits.Day(day.id(), day.name(), day.weekday(), moves);
    }

    private static ProgramEdits.Day withoutMove(ProgramEdits.Day day, int at) {
        List<ProgramEdits.Move> moves = new ArrayList<>(day.moves());
        moves.remove(at);
        return new ProgramEdits.Day(day.id(), day.name(), day.weekday(), moves);
    }
}
