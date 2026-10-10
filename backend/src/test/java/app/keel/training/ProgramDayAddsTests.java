package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.Parameters;
import app.keel.engine.RepositoryParameters;
import app.keel.engine.Sex;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.OptionalInt;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.UUID;
import org.assertj.core.groups.Tuple;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * A training day added to the program (K-1012, ADR-073 Ek 9), without a database. The new day is what the generator gives
 * that weekday for the program's weekdays plus the new one (no coaching rule of its own, U14); every day the program has
 * stays as it was, ids and targets; what the review makes of the program with the day is pinned; the user's own
 * program, a taken weekday, a day on no weekday and a seventh day are refused.
 */
class ProgramDayAddsTests {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static ExerciseCatalog catalog;
    private static ProgramTemplates templates;

    @BeforeAll
    static void load() throws IOException {
        catalog = ExerciseCatalogTestData.catalog();
        templates = ProgramTemplates.of(ProgramTemplateTests.files(), catalog);
    }

    /** Every set of {@code size} weekdays (the program a user of that many days has). */
    private static List<Set<DayOfWeek>> weekdaySets(int size) {
        List<Set<DayOfWeek>> sets = new ArrayList<>();
        for (int mask = 1; mask < 1 << 7; mask++) {
            if (Integer.bitCount(mask) == size) {
                Set<DayOfWeek> set = EnumSet.noneOf(DayOfWeek.class);
                for (DayOfWeek day : DayOfWeek.values()) {
                    if ((mask & 1 << day.ordinal()) != 0) {
                        set.add(day);
                    }
                }
                sets.add(set);
            }
        }
        return sets;
    }

    /** The program as the store has it after the generator made it: ids on every day and move, a target on every move. */
    private static ProgramStore.Program stored(Set<DayOfWeek> weekdays) {
        return new ProgramStore.Program(UUID.randomUUID(), ProgramStore.Source.GENERATED, ProgramGenerator.generate(weekdays, templates, catalog, P)
                .stream().map(day -> new ProgramStore.Day(UUID.randomUUID(), day.nameKey(), null, day.weekday(), day.exercises().stream()
                        .map(planned -> new ProgramStore.PlannedExercise(planned.exerciseId(), planned.sets(), planned.reps().min(), planned.reps().max(),
                                planned.targetRir(), new BigDecimal("42.5"), planned.reps().min(), new BigDecimal("40"), UUID.randomUUID(), null, false))
                        .toList())).toList());
    }

    private static ProgramStore.Day onWeekday(List<ProgramStore.Day> days, DayOfWeek weekday) {
        return days.stream().filter(day -> day.weekday() == weekday).findFirst().orElseThrow();
    }

    @Test
    void theNewDayIsWhatTheGeneratorGivesThatWeekdayForTheProgramsWeekdaysAndTheNewOne() {
        for (int size = 1; size <= 5; size++) {
            for (Set<DayOfWeek> weekdays : weekdaySets(size)) {
                ProgramStore.Program program = stored(weekdays);
                for (DayOfWeek added : EnumSet.complementOf(EnumSet.copyOf(weekdays))) {
                    Set<DayOfWeek> all = EnumSet.copyOf(weekdays);
                    all.add(added);
                    ProgramGenerator.PlannedDay expected = ProgramGenerator.generate(all, templates, catalog, P).stream()
                            .filter(day -> day.weekday() == added).findFirst().orElseThrow();

                    ProgramStore.Day day = onWeekday(ProgramDayAdds.added(program, added, templates, catalog, P).orElseThrow(), added);

                    String where = weekdays + " + " + added;
                    assertThat(day.nameKey()).as(where).isEqualTo(expected.nameKey());
                    assertThat(day.name()).as(where).isNull();
                    assertThat(day.id()).as(where + ": stored with a new id").isNull();
                    assertThat(day.exercises()).as(where).extracting(ProgramStore.PlannedExercise::exerciseId, ProgramStore.PlannedExercise::sets,
                            ProgramStore.PlannedExercise::repMin, ProgramStore.PlannedExercise::repMax, ProgramStore.PlannedExercise::targetRir)
                            .containsExactlyElementsOf(expected.exercises().stream().map(planned -> Tuple.tuple(
                                    planned.exerciseId(), planned.sets(), planned.reps().min(), planned.reps().max(), planned.targetRir())).toList());
                    assertThat(day.exercises()).as(where + ": new rows, no target").allSatisfy(move -> {
                        assertThat(move.id()).isNull();
                        assertThat(move.nextLoadKg()).isNull();
                    });
                }
            }
        }
    }

    @Test
    void mondayWednesdayFridayAndSaturdayWithTuesdayGetsTheFiveDayTemplatesLowerDayAtTuesdaysPlace() {
        ProgramStore.Program program = stored(EnumSet.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY));

        List<ProgramStore.Day> days = ProgramDayAdds.added(program, DayOfWeek.TUESDAY, templates, catalog, P).orElseThrow();

        assertThat(days).extracting(ProgramStore.Day::weekday).containsExactly(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
                DayOfWeek.FRIDAY, DayOfWeek.SATURDAY);
        ProgramStore.Day lower = days.get(1);
        assertThat(lower.nameKey()).isEqualTo("programDays.lower.name");
        assertThat(lower.exercises()).extracting(ProgramStore.PlannedExercise::exerciseId).containsExactly("squat", "romanian_deadlift", "hip_thrust",
                "leg_extension", "standing_calf_raise");
    }

    @Test
    void everyDayTheProgramHadStaysExactlyAsItWasWithItsIdsRowsAndTargets() {
        for (int size = 1; size <= 5; size++) {
            for (Set<DayOfWeek> weekdays : weekdaySets(size)) {
                ProgramStore.Program program = stored(weekdays);
                for (DayOfWeek added : EnumSet.complementOf(EnumSet.copyOf(weekdays))) {
                    List<ProgramStore.Day> days = ProgramDayAdds.added(program, added, templates, catalog, P).orElseThrow();

                    assertThat(days).as(weekdays + " + " + added).hasSize(size + 1);
                    assertThat(days.stream().filter(day -> day.id() != null).toList()).isEqualTo(program.days());
                    assertThat(days).extracting(ProgramStore.Day::weekday).isSorted();
                }
            }
        }
    }

    /**
     * Balance, measured and pinned (ADR-073 Ek 9): the day is a day of the template for one more day, which keeps the limits as a
     * whole (ProgramTemplateTests), but the days the program had come from another split. What the review (ADR-073 #2) then
     * suggests, for every weekday set and every weekday added: nothing from two days (to three, the 1. week call's case); a
     * muscle the added day brings in under its weekly minimum (G1 K-11) from one, three and four; from five days only to train
     * fewer (G1 K-36). Never too many sets, a rep range outside the template's, or a muscle trained once. The user decides on
     * the suggestions; a change in the templates that moves this table is a coaching change, taken to the product owner.
     */
    @Test
    void theReviewOfTheProgramWithTheDayAsksNothingFromTwoDaysAndOnlyTheMinimumOfAMuscleTheDayBringsInFromTheOthers() {
        Map<Integer, Set<String>> suggested = new TreeMap<>();
        for (int size = 1; size <= 5; size++) {
            suggested.put(size, new TreeSet<>());
            for (Set<DayOfWeek> weekdays : weekdaySets(size)) {
                ProgramStore.Program program = stored(weekdays);
                for (DayOfWeek added : EnumSet.complementOf(EnumSet.copyOf(weekdays))) {
                    List<ProgramStore.Day> days = ProgramDayAdds.added(program, added, templates, catalog, P).orElseThrow();

                    ProgramReviews.suggestions(new ProgramStore.Program(program.id(), program.source(), days), catalog, P)
                            .forEach(suggestion -> suggested.get(weekdays.size()).add(suggestion.id()));
                }
            }
        }

        assertThat(suggested).containsExactly(
                Map.entry(1, Set.of("TOO_FEW_SETS:biceps", "TOO_FEW_SETS:calves", "TOO_FEW_SETS:rear_delts")),
                Map.entry(2, Set.of()),
                Map.entry(3, Set.of("TOO_FEW_SETS:rear_delts")),
                Map.entry(4, Set.of("TOO_FEW_SETS:forearms")),
                Map.entry(5, Set.of("TOO_MANY_DAYS")));
    }

    @Test
    void anUndoOfTheAddTakesTheDayOutAndPutsBackTheProgramAsItWas() {
        ProgramStore.Program before = stored(EnumSet.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY));
        // As stored: the new day and its moves get ids.
        List<ProgramStore.Day> days = ProgramDayAdds.added(before, DayOfWeek.TUESDAY, templates, catalog, P).orElseThrow().stream()
                .map(day -> day.id() != null ? day : new ProgramStore.Day(UUID.randomUUID(), day.nameKey(), day.name(), day.weekday(),
                        day.exercises().stream().map(move -> new ProgramStore.PlannedExercise(move.exerciseId(), move.sets(), move.repMin(),
                                move.repMax(), move.targetRir(), null, null, null, UUID.randomUUID(), null, false)).toList()))
                .toList();
        ProgramStore.Program after = new ProgramStore.Program(before.id(), before.source(), days);

        ProgramReviews.Outcome undone = ProgramReviews.undo(List.of(ProgramReviews.Step.edit(before, after)), OptionalInt.of(0), after, catalog, P);

        assertThat(undone.program()).isEqualTo(before);
        assertThat(undone.skipped()).isEmpty();
    }

    @Test
    void theUsersOwnProgramATakenWeekdayADayOnNoWeekdayAndASeventhDayAreRefused() {
        Set<DayOfWeek> three = EnumSet.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY);
        ProgramStore.Program generated = stored(three);

        ProgramStore.Program own = new ProgramStore.Program(generated.id(), ProgramStore.Source.OWN, generated.days());
        assertThat(ProgramDayAdds.added(own, DayOfWeek.TUESDAY, templates, catalog, P)).as("own program").isEmpty();

        assertThat(ProgramDayAdds.added(generated, DayOfWeek.WEDNESDAY, templates, catalog, P)).as("taken weekday").isEmpty();

        List<ProgramStore.Day> unplaced = new ArrayList<>(generated.days());
        ProgramStore.Day last = unplaced.removeLast();
        unplaced.add(new ProgramStore.Day(last.id(), last.nameKey(), last.name(), null, last.exercises()));
        assertThat(ProgramDayAdds.added(new ProgramStore.Program(generated.id(), generated.source(), unplaced), DayOfWeek.TUESDAY, templates, catalog, P))
                .as("a day on no weekday").isEmpty();

        ProgramStore.Program six = stored(EnumSet.complementOf(EnumSet.of(DayOfWeek.SUNDAY)));
        assertThat(ProgramDayAdds.added(six, DayOfWeek.SUNDAY, templates, catalog, P)).as("a seventh day").isEmpty();
        assertThat(ProgramDayAdds.added(stored(EnumSet.complementOf(EnumSet.of(DayOfWeek.SUNDAY, DayOfWeek.SATURDAY))), DayOfWeek.SATURDAY, templates,
                catalog, P)).as("a sixth day is allowed (the review asks to train fewer)").isPresent();
    }
}
