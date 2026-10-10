package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import app.keel.engine.RepRange;
import app.keel.engine.RepositoryParameters;
import app.keel.engine.Sex;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.OptionalInt;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;
import java.util.stream.Collectors;
import org.assertj.core.groups.Tuple;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * A training day added to the program (K-1012, ADR-073 Ek 9), without a database. The day is added only to a program of
 * add_day_from_days days (2: the first week's call, to three); the new day is what the program template for one more day has
 * at that weekday's place in the week (no coaching rule of its own, U14); every day the program has stays as it was, ids and
 * targets; a move the program already has a starting weight for has it in the new day too (ADR-072 #5); what the review makes
 * of the program with the day is pinned; any other number of days, the user's own program, a taken weekday and a day on no
 * weekday are refused.
 */
class ProgramDayAddsTests {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    /** The number of days a program has when a day is added to it (every other number is refused). */
    private static final int FROM = P.wholeNumber(ParameterKey.ADD_DAY_FROM_DAYS);
    private static final int ASKED_REPS = StartingWeightReps.fromClasspath().reps();
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

    private static boolean compound(String exerciseId) {
        return catalog.find(exerciseId).orElseThrow().kind() == ExerciseCatalog.Kind.COMPOUND;
    }

    /**
     * The program as the store has it after the starting weights call: each compound move carries the 40 kg it was given (an
     * isolation move has none, LOAD_PROGRESSION_COMPOUND_ONLY), while a session has since moved its target on to 45 kg.
     */
    private static ProgramStore.Program storedWithStartingWeights(Set<DayOfWeek> weekdays) {
        ProgramStore.Program program = stored(weekdays);
        return new ProgramStore.Program(program.id(), program.source(), program.days().stream()
                .map(day -> new ProgramStore.Day(day.id(), day.nameKey(), day.name(), day.weekday(), day.exercises().stream()
                        .map(move -> compound(move.exerciseId())
                                ? new ProgramStore.PlannedExercise(move.exerciseId(), move.sets(), move.repMin(), move.repMax(), move.targetRir(),
                                        new BigDecimal("45"), move.repMin(), new BigDecimal("42.5"), move.id(), Instant.parse("2026-10-05T10:00:00Z"), false,
                                        new BigDecimal("40"), move.repMin())
                                : move)
                        .toList()))
                .toList());
    }

    private static Optional<List<ProgramStore.Day>> add(ProgramStore.Program program, DayOfWeek weekday) {
        return ProgramDayAdds.added(program, weekday, templates, catalog, P, ASKED_REPS, Optional.empty());
    }

    private static ProgramStore.Day onWeekday(List<ProgramStore.Day> days, DayOfWeek weekday) {
        return days.stream().filter(day -> day.weekday() == weekday).findFirst().orElseThrow();
    }

    @Test
    void theNewDayIsTheNextSizeTemplatesDayAtTheNewWeekdaysPlaceWithTheRangesAndRirOfTheParameters() {
        // Not through the generator: by the template for one more day, the day at the weekday's rank among the weekdays.
        List<ProgramTemplates.Day> template = templates.forDays(FROM + 1).orElseThrow();
        RepRange compoundRange = new RepRange(P.wholeNumber(ParameterKey.REP_RANGE_COMPOUND_MIN), P.wholeNumber(ParameterKey.REP_RANGE_COMPOUND_MAX));
        RepRange isolationRange = new RepRange(P.wholeNumber(ParameterKey.REP_RANGE_ISOLATION_MIN), P.wholeNumber(ParameterKey.REP_RANGE_ISOLATION_MAX));
        int checked = 0;
        for (Set<DayOfWeek> weekdays : weekdaySets(FROM)) {
            ProgramStore.Program program = stored(weekdays);
            for (DayOfWeek added : EnumSet.complementOf(EnumSet.copyOf(weekdays))) {
                Set<DayOfWeek> all = EnumSet.copyOf(weekdays);
                all.add(added);
                ProgramTemplates.Day expected = template.get(new ArrayList<>(new TreeSet<>(all)).indexOf(added));

                ProgramStore.Day day = onWeekday(add(program, added).orElseThrow(), added);

                String where = weekdays + " + " + added;
                assertThat(day.nameKey()).as(where).isEqualTo(expected.nameKey());
                assertThat(day.name()).as(where).isNull();
                assertThat(day.id()).as(where + ": stored with a new id").isNull();
                assertThat(day.exercises()).as(where).extracting(ProgramStore.PlannedExercise::exerciseId, ProgramStore.PlannedExercise::sets)
                        .containsExactlyElementsOf(expected.exercises().stream().map(slot -> Tuple.tuple(slot.exerciseId(), slot.sets())).toList());
                assertThat(day.exercises()).as(where + ": the rep range of the move's kind, the RIR target, a new row").allSatisfy(move -> {
                    assertThat(new RepRange(move.repMin(), move.repMax())).isEqualTo(compound(move.exerciseId()) ? compoundRange : isolationRange);
                    assertThat(move.targetRir()).isEqualTo(P.wholeNumber(ParameterKey.TARGET_RIR_MAX));
                    assertThat(move.id()).isNull();
                });
                checked++;
            }
        }
        assertThat(checked).as("every pair of weekdays with every other weekday added").isEqualTo(21 * 5);
    }

    @Test
    void mondayAndFridayWithWednesdayGetsTheThreeDayTemplatesLowerDayAtWednesdaysPlace() {
        ProgramStore.Program program = stored(EnumSet.of(DayOfWeek.MONDAY, DayOfWeek.FRIDAY));

        List<ProgramStore.Day> days = add(program, DayOfWeek.WEDNESDAY).orElseThrow();

        assertThat(days).extracting(ProgramStore.Day::weekday).containsExactly(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY);
        ProgramStore.Day lower = days.get(1);
        assertThat(lower.nameKey()).isEqualTo("programDays.lower.name");
        assertThat(lower.exercises()).extracting(ProgramStore.PlannedExercise::exerciseId).containsExactly("squat", "romanian_deadlift", "leg_extension",
                "standing_calf_raise");
    }

    @Test
    void theDaysTheProgramHadStayExactlyAsTheyWereWithTheirIdsRowsAndTargets() {
        for (Set<DayOfWeek> weekdays : weekdaySets(FROM)) {
            ProgramStore.Program program = storedWithStartingWeights(weekdays);
            for (DayOfWeek added : EnumSet.complementOf(EnumSet.copyOf(weekdays))) {
                List<ProgramStore.Day> days = add(program, added).orElseThrow();

                assertThat(days).as(weekdays + " + " + added).hasSize(FROM + 1);
                assertThat(days.stream().filter(day -> day.id() != null).toList()).isEqualTo(program.days());
                assertThat(days).extracting(ProgramStore.Day::weekday).isSorted();
            }
        }
    }

    @Test
    void aMoveTheProgramHasAStartingWeightForHasItInTheNewDayToo() {
        // ADR-072 #5: a load the user gave is the move's first target on every day it is planned, as the starting weights call makes it
        // (from the bottom of the range, as the gym in use makes the load); the target a session moved on (45 kg) is not the load known.
        int withTarget = 0;
        for (Set<DayOfWeek> weekdays : weekdaySets(FROM)) {
            ProgramStore.Program program = storedWithStartingWeights(weekdays);
            Set<String> known = program.days().stream().flatMap(day -> day.exercises().stream()).map(ProgramStore.PlannedExercise::exerciseId)
                    .filter(ProgramDayAddsTests::compound).collect(Collectors.toSet());
            for (DayOfWeek added : EnumSet.complementOf(EnumSet.copyOf(weekdays))) {
                for (ProgramStore.PlannedExercise move : onWeekday(add(program, added).orElseThrow(), added).exercises()) {
                    String where = weekdays + " + " + added + " " + move.exerciseId();
                    if (known.contains(move.exerciseId()) && move.repMin() <= ASKED_REPS) {
                        assertThat(move.nextLoadKg()).as(where).isEqualByComparingTo("40");
                        assertThat(move.nextReps()).as(where).isEqualTo(move.repMin());
                        assertThat(move.startLoadKg()).as(where).isEqualByComparingTo("40");
                        assertThat(move.startReps()).as(where).isEqualTo(move.repMin());
                        assertThat(move.nextFrom()).as(where + ": no session set it").isNull();
                        assertThat(move.lastLoadKg()).as(where).isNull();
                        withTarget++;
                    } else {
                        assertThat(move.nextLoadKg()).as(where + ": no load known, the first session finds it").isNull();
                        assertThat(move.startLoadKg()).as(where).isNull();
                    }
                }
            }
        }
        assertThat(withTarget).as("the two-day programs and the three-day template share compound moves").isPositive();
    }

    @Test
    void aStartingWeightIsNotGivenToARangeStartingAboveTheRepsItWasGivenFor() {
        ProgramStore.Program program = storedWithStartingWeights(EnumSet.of(DayOfWeek.MONDAY, DayOfWeek.FRIDAY));
        List<ProgramStore.PlannedExercise> withLoad = onWeekday(add(program, DayOfWeek.WEDNESDAY).orElseThrow(), DayOfWeek.WEDNESDAY).exercises().stream()
                .filter(move -> move.nextLoadKg() != null).toList();
        assertThat(withLoad).as("the day shares a compound move with the program").isNotEmpty();
        int minimum = withLoad.getFirst().repMin();

        // The same call for fewer reps than the range starts at (NextTargets.starting): none, as the starting weights call finds.
        List<ProgramStore.PlannedExercise> asked = onWeekday(ProgramDayAdds.added(program, DayOfWeek.WEDNESDAY, templates, catalog, P, minimum - 1,
                Optional.empty()).orElseThrow(), DayOfWeek.WEDNESDAY).exercises();
        assertThat(asked).filteredOn(move -> move.repMin() == minimum).allSatisfy(move -> assertThat(move.nextLoadKg()).isNull());
    }

    /**
     * Balance, measured and pinned (ADR-073 Ek 9): the day is a day of the template for one more day, which keeps the limits as a
     * whole (ProgramTemplateTests), but the days the program had come from another split. What the review (ADR-073 #2) then
     * suggests, for every pair of weekdays and every weekday added: nothing, the first week call's case. The balance was
     * measured for this number of days only (the others are refused). A change in the templates that moves this is a coaching
     * change, taken to the product owner.
     */
    @Test
    void theReviewOfTheProgramWithTheDayAsksNothing() {
        Set<String> suggested = new TreeSet<>();
        for (Set<DayOfWeek> weekdays : weekdaySets(FROM)) {
            ProgramStore.Program program = stored(weekdays);
            for (DayOfWeek added : EnumSet.complementOf(EnumSet.copyOf(weekdays))) {
                List<ProgramStore.Day> days = add(program, added).orElseThrow();

                ProgramReviews.suggestions(new ProgramStore.Program(program.id(), program.source(), days), catalog, P)
                        .forEach(suggestion -> suggested.add(weekdays + " + " + added + ": " + suggestion.id()));
            }
        }

        assertThat(suggested).isEmpty();
    }

    @Test
    void anUndoOfTheAddTakesTheDayOutAndPutsBackTheProgramAsItWas() {
        ProgramStore.Program before = storedWithStartingWeights(EnumSet.of(DayOfWeek.MONDAY, DayOfWeek.FRIDAY));
        // As stored: the new day and its moves get ids.
        List<ProgramStore.Day> days = add(before, DayOfWeek.WEDNESDAY).orElseThrow().stream()
                .map(day -> day.id() != null ? day : new ProgramStore.Day(UUID.randomUUID(), day.nameKey(), day.name(), day.weekday(),
                        day.exercises().stream().map(move -> new ProgramStore.PlannedExercise(move.exerciseId(), move.sets(), move.repMin(),
                                move.repMax(), move.targetRir(), move.nextLoadKg(), move.nextReps(), move.lastLoadKg(), UUID.randomUUID(), null, false,
                                move.startLoadKg(), move.startReps())).toList()))
                .toList();
        ProgramStore.Program after = new ProgramStore.Program(before.id(), before.source(), days);

        ProgramReviews.Outcome undone = ProgramReviews.undo(List.of(ProgramReviews.Step.edit(before, after)), OptionalInt.of(0), after, catalog, P);

        assertThat(undone.program()).isEqualTo(before);
        assertThat(undone.skipped()).isEmpty();
    }

    @Test
    void aProgramOfAnyOtherNumberOfDaysIsRefusedOnEveryWeekdayAndNothingIsChanged() {
        // 2 to 3 is the one add the template for one more day is known to balance; the rest go to Edit (ADR-073 Ek 9).
        for (int size = 1; size <= 6; size++) {
            if (size == FROM) {
                continue;
            }
            for (Set<DayOfWeek> weekdays : weekdaySets(size)) {
                ProgramStore.Program program = stored(weekdays);
                for (DayOfWeek added : DayOfWeek.values()) {
                    assertThat(add(program, added)).as(size + " days " + weekdays + " + " + added).isEmpty();
                }
            }
        }
    }

    @Test
    void theNumberOfDaysTheAddStartsFromHasATemplateForOneMoreDay() {
        assertThat(FROM).as("add_day_from_days (Levent, ADR-073 Ek 9)").isEqualTo(2);
        assertThat(templates.forDays(FROM + 1)).as("the template the new day comes from").isPresent();
    }

    @Test
    void theUsersOwnProgramATakenWeekdayAndADayOnNoWeekdayAreRefused() {
        ProgramStore.Program generated = stored(EnumSet.of(DayOfWeek.MONDAY, DayOfWeek.FRIDAY));
        assertThat(add(generated, DayOfWeek.WEDNESDAY)).as("generated, free weekday").isPresent();

        ProgramStore.Program own = new ProgramStore.Program(generated.id(), ProgramStore.Source.OWN, generated.days());
        assertThat(add(own, DayOfWeek.WEDNESDAY)).as("own program").isEmpty();

        assertThat(add(generated, DayOfWeek.FRIDAY)).as("taken weekday").isEmpty();

        List<ProgramStore.Day> unplaced = new ArrayList<>(generated.days());
        ProgramStore.Day last = unplaced.removeLast();
        unplaced.add(new ProgramStore.Day(last.id(), last.nameKey(), last.name(), null, last.exercises()));
        assertThat(add(new ProgramStore.Program(generated.id(), generated.source(), unplaced), DayOfWeek.WEDNESDAY)).as("a day on no weekday").isEmpty();
    }
}
