package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import app.keel.engine.ProgramReview;
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
import java.util.Map;
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
 * A training day added to the program (K-1012, ADR-073 Ek 9; K-1060, ADR-090 Ek 1), without a database. The new day is what the
 * program template for one more day has at that weekday's place in the week (no coaching rule of its own, U14); a program as the
 * generator made it, other than the two-day one whose add was measured to balance, is replanned to that template whole, each day on
 * its weekday keeping its id and each move the plan has again its row and target; a program the user changed or brought, the
 * two-day one, or any program when a workout was started today, is added to: every day the program has stays as it was, ids and
 * targets. A move the program already has a starting weight for has it in the new day
 * too (ADR-072 #5); what the review makes of the program with the day is pinned; a taken weekday, a day on no weekday and an
 * eighth day are refused.
 */
class ProgramDayAddsTests {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    /** The number of days of the one step whose add to the old split was measured to balance (the first week's call, ADR-073 Ek 9). */
    private static final int FROM = P.wholeNumber(ParameterKey.ADD_DAY_BALANCED_DAYS);
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

    /** The day added to the program as it is (the program is not replanned). */
    private static Optional<List<ProgramStore.Day>> add(ProgramStore.Program program, DayOfWeek weekday) {
        return ProgramDayAdds.added(program, weekday, templates, catalog, P, ASKED_REPS, Optional.empty(), false);
    }

    /** The day added where a program as the generator made it may be replanned. */
    private static Optional<List<ProgramStore.Day>> replan(ProgramStore.Program program, DayOfWeek weekday) {
        return ProgramDayAdds.added(program, weekday, templates, catalog, P, ASKED_REPS, Optional.empty(), true);
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
                Optional.empty(), false).orElseThrow(), DayOfWeek.WEDNESDAY).exercises();
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
    void aProgramOfAnyNumberOfDaysBelowSevenTakesADayAndSevenDaysTakeNone() {
        // ADR-090 Ek 1: a day is added wherever there is a template for one more day (K-1060 lifts the two-day limit of Ek 9).
        for (int size = 1; size <= 6; size++) {
            for (Set<DayOfWeek> weekdays : weekdaySets(size)) {
                ProgramStore.Program program = stored(weekdays);
                int more = size + 1;
                for (DayOfWeek added : EnumSet.complementOf(EnumSet.copyOf(weekdays))) {
                    String where = size + " days " + weekdays + " + " + added;
                    assertThat(add(program, added)).as(where).hasValueSatisfying(days -> assertThat(days).hasSize(more));
                    assertThat(replan(program, added)).as(where + ", replanned").hasValueSatisfying(days -> assertThat(days).hasSize(more));
                }
            }
        }
        for (DayOfWeek added : DayOfWeek.values()) {
            assertThat(add(stored(EnumSet.allOf(DayOfWeek.class)), added)).as("seven days").isEmpty();
        }
    }

    @Test
    void everyNumberOfDaysTheAddCanStartFromHasATemplateForOneMoreDay() {
        for (int size = 1; size <= 6; size++) {
            assertThat(templates.forDays(size + 1)).as(size + 1 + " days: the template the new day comes from").isPresent();
        }
        assertThat(templates.forDays(8)).as("seven is the most").isEmpty();
    }

    @Test
    void aProgramAsTheGeneratorMadeItIsReplannedToTheTemplateForOneMoreDayOnItsWeekdaysAndTheNewOne() {
        for (int size = 1; size <= 6; size++) {
            if (size == FROM) {
                continue;
            }
            for (Set<DayOfWeek> weekdays : weekdaySets(size)) {
                ProgramStore.Program program = stored(weekdays);
                DayOfWeek added = EnumSet.complementOf(EnumSet.copyOf(weekdays)).iterator().next();
                Set<DayOfWeek> all = EnumSet.copyOf(weekdays);
                all.add(added);
                List<ProgramGenerator.PlannedDay> expected = ProgramGenerator.generate(all, templates, catalog, P);

                List<ProgramStore.Day> days = replan(program, added).orElseThrow();

                String where = size + " days " + weekdays + " + " + added;
                assertThat(days).as(where).extracting(ProgramStore.Day::weekday)
                        .containsExactlyElementsOf(expected.stream().map(ProgramGenerator.PlannedDay::weekday).toList());
                assertThat(days).as(where).extracting(ProgramStore.Day::nameKey)
                        .containsExactlyElementsOf(expected.stream().map(ProgramGenerator.PlannedDay::nameKey).toList());
                for (int d = 0; d < days.size(); d++) {
                    assertThat(days.get(d).exercises()).as(where + " day " + d)
                            .extracting(ProgramStore.PlannedExercise::exerciseId, ProgramStore.PlannedExercise::sets)
                            .containsExactlyElementsOf(expected.get(d).exercises().stream().map(move -> Tuple.tuple(move.exerciseId(), move.sets())).toList());
                }
                assertThat(ProgramReviews.suggestions(new ProgramStore.Program(program.id(), program.source(), days), catalog, P))
                        .as(where + ": a number of days the user may choose is never flagged").extracting(ProgramReviews.Suggestion::finding)
                        .doesNotContain(ProgramReview.Finding.TOO_MANY_DAYS);
            }
        }
    }

    @Test
    void theTwoDayProgramTheFirstWeekAddsToIsNeverReplannedItsAddWasMeasuredToBalance() {
        assertThat(FROM).as("add_day_balanced_days (Levent, ADR-073 Ek 9)").isEqualTo(2);
        for (Set<DayOfWeek> weekdays : weekdaySets(FROM)) {
            ProgramStore.Program program = storedWithStartingWeights(weekdays);
            for (DayOfWeek added : EnumSet.complementOf(EnumSet.copyOf(weekdays))) {
                assertThat(replan(program, added)).as(weekdays + " + " + added).isEqualTo(add(program, added));
            }
        }
    }

    @Test
    void aReplanKeepsEachDaysIdOnItsWeekdayAndEachKeptMovesRowAndTargetOnceAndGivesTheRestNewRows() {
        ProgramStore.Program program = storedWithStartingWeights(EnumSet.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY));
        Map<DayOfWeek, UUID> ids = program.days().stream().collect(Collectors.toMap(ProgramStore.Day::weekday, ProgramStore.Day::id));
        Set<UUID> rows = program.days().stream().flatMap(day -> day.exercises().stream()).map(ProgramStore.PlannedExercise::id).collect(Collectors.toSet());

        List<ProgramStore.Day> days = replan(program, DayOfWeek.SATURDAY).orElseThrow();

        assertThat(days).extracting(ProgramStore.Day::weekday).containsExactly(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY);
        days.stream().filter(day -> day.weekday() != DayOfWeek.SATURDAY)
                .forEach(day -> assertThat(day.id()).as(day.weekday().name()).isEqualTo(ids.get(day.weekday())));
        assertThat(onWeekday(days, DayOfWeek.SATURDAY).id()).as("the new day is stored with a new id").isNull();
        List<ProgramStore.PlannedExercise> kept = days.stream().flatMap(day -> day.exercises().stream()).filter(move -> move.id() != null).toList();
        assertThat(kept).extracting(ProgramStore.PlannedExercise::id).doesNotHaveDuplicates().isSubsetOf(rows);
        assertThat(kept).as("a kept compound move keeps its target and starting weight").filteredOn(move -> compound(move.exerciseId()))
                .allSatisfy(move -> {
                    assertThat(move.nextLoadKg()).isEqualByComparingTo("45");
                    assertThat(move.startLoadKg()).isEqualByComparingTo("40");
                });
        assertThat(days.stream().flatMap(day -> day.exercises().stream()).filter(move -> move.id() == null)).as("a move the program did not have")
                .isNotEmpty();
    }

    @Test
    void aProgramTheUserChangedOrBroughtIsNeverReplannedAndKeepsEveryDay() {
        ProgramStore.Program generated = stored(EnumSet.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY));
        assertThat(ProgramDayAdds.asGenerated(generated, templates, catalog, P)).isTrue();

        // A move with other sets: an edit.
        List<ProgramStore.Day> edited = new ArrayList<>(generated.days());
        ProgramStore.Day first = edited.getFirst();
        List<ProgramStore.PlannedExercise> moves = new ArrayList<>(first.exercises());
        moves.set(0, moves.getFirst().withSets(moves.getFirst().sets() + 1));
        edited.set(0, new ProgramStore.Day(first.id(), first.nameKey(), first.name(), first.weekday(), moves));
        ProgramStore.Program changed = new ProgramStore.Program(generated.id(), generated.source(), edited);
        ProgramStore.Program own = new ProgramStore.Program(generated.id(), ProgramStore.Source.OWN, generated.days());

        for (ProgramStore.Program program : List.of(changed, own)) {
            assertThat(ProgramDayAdds.asGenerated(program, templates, catalog, P)).as(program.source().name()).isFalse();
            List<ProgramStore.Day> days = replan(program, DayOfWeek.SATURDAY).orElseThrow();
            assertThat(days).hasSize(4);
            assertThat(days.stream().filter(day -> day.id() != null).toList()).as("every day the program had, as it was").isEqualTo(program.days());
            assertThat(onWeekday(days, DayOfWeek.SATURDAY).nameKey()).as("the four-day template's fourth day")
                    .isEqualTo(templates.forDays(4).orElseThrow().get(3).nameKey());
        }
    }

    @Test
    void sixDaysBecomeTheSevenDayTemplateAndSevenDaysAreTheMost() {
        ProgramStore.Program six = stored(EnumSet.of(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY,
                DayOfWeek.SATURDAY));

        List<ProgramStore.Day> seven = replan(six, DayOfWeek.SUNDAY).orElseThrow();

        assertThat(seven).extracting(ProgramStore.Day::nameKey)
                .containsExactlyElementsOf(templates.forDays(7).orElseThrow().stream().map(ProgramTemplates.Day::nameKey).toList());
        assertThat(ProgramDayAdds.canAdd(new ProgramStore.Program(six.id(), six.source(), seven), templates)).as("the eighth day").isFalse();
    }

    @Test
    void canAddIsTrueForAnyProgramBelowSevenDaysEachOnItsOwnWeekday() {
        // Program.canAddDay (K-1013, K-1060): the phone offers the add only where the server will do it, by this one rule.
        for (int size = 1; size <= 7; size++) {
            for (Set<DayOfWeek> weekdays : weekdaySets(size)) {
                assertThat(ProgramDayAdds.canAdd(stored(weekdays), templates)).as(size + " days " + weekdays).isEqualTo(size < 7);
            }
        }
        ProgramStore.Program generated = stored(EnumSet.of(DayOfWeek.MONDAY, DayOfWeek.FRIDAY));
        assertThat(ProgramDayAdds.canAdd(new ProgramStore.Program(generated.id(), ProgramStore.Source.OWN, generated.days()), templates)).as("own program")
                .isTrue();

        // Evre 7 (issue 684): a day on no weekday ("any day" of a typed or brought program) does not stop an add: the add used to be refused for it,
        // so the phone's editor gave an empty day with no moves.
        List<ProgramStore.Day> unplaced = new ArrayList<>(generated.days());
        ProgramStore.Day last = unplaced.removeLast();
        unplaced.add(new ProgramStore.Day(last.id(), last.nameKey(), last.name(), null, last.exercises()));
        assertThat(ProgramDayAdds.canAdd(new ProgramStore.Program(generated.id(), generated.source(), unplaced), templates)).as("a day on no weekday")
                .isTrue();

        ProgramStore.Day first = generated.days().getFirst();
        List<ProgramStore.Day> twice = List.of(first, new ProgramStore.Day(UUID.randomUUID(), first.nameKey(), first.name(), first.weekday(), first.exercises()));
        assertThat(ProgramDayAdds.canAdd(new ProgramStore.Program(generated.id(), generated.source(), twice), templates)).as("two days on one weekday")
                .isFalse();
    }

    @Test
    void anAddIsDoneForAFreeWeekdayExactlyWhenTheProgramCanTakeADay() {
        // One rule for both: wherever canAdd, every free weekday adds (a taken one is the endpoint's own refusal); wherever not, none does.
        for (int size = 1; size <= 7; size++) {
            for (Set<DayOfWeek> weekdays : weekdaySets(size)) {
                ProgramStore.Program program = stored(weekdays);
                for (DayOfWeek day : DayOfWeek.values()) {
                    boolean expected = ProgramDayAdds.canAdd(program, templates) && !weekdays.contains(day);
                    assertThat(add(program, day).isPresent()).as(size + " days " + weekdays + " + " + day).isEqualTo(expected);
                    assertThat(replan(program, day).isPresent()).as(size + " days " + weekdays + " + " + day + ", replanned").isEqualTo(expected);
                }
            }
        }
    }

    @Test
    void aTakenWeekdayIsRefusedAndTheUsersOwnProgramTakesTheDay() {
        ProgramStore.Program generated = stored(EnumSet.of(DayOfWeek.MONDAY, DayOfWeek.FRIDAY));
        assertThat(add(generated, DayOfWeek.WEDNESDAY)).as("generated, free weekday").isPresent();

        // ADR-090 Ek 1: the user's own program takes the generator's day too (the empty day of Edit was the missing flow).
        ProgramStore.Program own = new ProgramStore.Program(generated.id(), ProgramStore.Source.OWN, generated.days());
        assertThat(add(own, DayOfWeek.WEDNESDAY)).as("own program").isPresent();

        assertThat(add(generated, DayOfWeek.FRIDAY)).as("taken weekday").isEmpty();

    }

    /** The program of the user's own whose days have the given weekdays (null: "any day"), each with one move and an id. */
    private static ProgramStore.Program ownWith(DayOfWeek... weekdays) {
        List<ProgramStore.Day> days = new ArrayList<>();
        for (int i = 0; i < weekdays.length; i++) {
            days.add(new ProgramStore.Day(UUID.randomUUID(), null, "Day " + (i + 1), weekdays[i], List.of(new ProgramStore.PlannedExercise("bench_press", 3, 6, 10, 1))));
        }
        return new ProgramStore.Program(UUID.randomUUID(), ProgramStore.Source.OWN, days);
    }

    @Test
    void anOwnProgramOfDaysOnNoWeekdayTakesTheDayWithTheTemplatesMovesAndKeepsItsOwnDaysAsTheyAre() {
        // Evre 7 (issue 684), Levent's "Add a day came without moves": a program typed or brought in with days on "any day" was refused,
        // so the phone's editor made an empty day. The day is the template's now, laid among the weekdays the program has.
        ProgramStore.Program own = ownWith(null, null, null);
        List<ProgramTemplates.Day> template = templates.forDays(4).orElseThrow();

        List<ProgramStore.Day> days = add(own, DayOfWeek.MONDAY).orElseThrow();

        assertThat(days).hasSize(4);
        assertThat(days.subList(0, 3)).as("the user's own days, as they were").isEqualTo(own.days());
        ProgramStore.Day added = days.get(3);
        assertThat(added.weekday()).isEqualTo(DayOfWeek.MONDAY);
        assertThat(added.id()).as("stored with a new id").isNull();
        assertThat(added.nameKey()).isEqualTo(template.getFirst().nameKey());
        assertThat(added.exercises()).as("it comes with moves").isNotEmpty();
        assertThat(added.exercises()).extracting(ProgramStore.PlannedExercise::exerciseId, ProgramStore.PlannedExercise::sets)
                .containsExactlyElementsOf(template.getFirst().exercises().stream().map(slot -> Tuple.tuple(slot.exerciseId(), slot.sets())).toList());
    }

    @Test
    void aDayAddedToAMixOfPlacedAndUnplacedDaysGoesBeforeTheFirstLaterWeekdayAndTheOthersKeepTheirPlace() {
        ProgramStore.Program own = ownWith(null, DayOfWeek.WEDNESDAY, null);

        List<ProgramStore.Day> days = add(own, DayOfWeek.TUESDAY).orElseThrow();

        assertThat(days).extracting(ProgramStore.Day::weekday).containsExactly(null, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, null);
        assertThat(days.get(0)).isEqualTo(own.days().get(0));
        assertThat(days.get(2)).isEqualTo(own.days().get(1));
        assertThat(days.get(3)).isEqualTo(own.days().get(2));
        assertThat(days.get(1).exercises()).isNotEmpty();
    }

    @Test
    void aTakenWeekdayIsStillRefusedWhateverElseTheProgramHas() {
        assertThat(add(ownWith(null, DayOfWeek.WEDNESDAY), DayOfWeek.WEDNESDAY)).isEmpty();
        // Seven days are the most, placed or not.
        assertThat(add(ownWith(null, null, null, null, null, null, null), DayOfWeek.MONDAY)).isEmpty();
        assertThat(ProgramDayAdds.canAdd(ownWith(null, null, null, null, null, null), templates)).isTrue();
    }
}
