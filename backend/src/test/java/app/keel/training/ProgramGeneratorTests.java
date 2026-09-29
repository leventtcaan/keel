package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import app.keel.engine.RepRange;
import app.keel.engine.RepositoryParameters;
import app.keel.engine.Sex;
import java.io.IOException;
import java.time.DayOfWeek;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * A program for the user who has none (K-211): the template for the number of days they train, its days laid on their
 * weekdays in week order, each move with a rep range by kind (G1 K-21) and the work-set RIR target (G1 K-5).
 */
class ProgramGeneratorTests {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static ExerciseCatalog catalog;
    private static ProgramTemplates templates;

    @BeforeAll
    static void load() throws IOException {
        catalog = ExerciseCatalogTestData.catalog();
        templates = ProgramTemplates.of(ProgramTemplateTests.files(), catalog);
    }

    @Test
    void fourDaysAreUpperLowerTwiceOnTheUsersWeekdays() {
        List<ProgramGenerator.PlannedDay> program = ProgramGenerator.generate(
                EnumSet.of(DayOfWeek.FRIDAY, DayOfWeek.MONDAY, DayOfWeek.THURSDAY, DayOfWeek.TUESDAY), templates, catalog, P);

        assertThat(program).extracting(ProgramGenerator.PlannedDay::nameKey, ProgramGenerator.PlannedDay::weekday).containsExactly(
                org.assertj.core.groups.Tuple.tuple("programDays.upper_a.name", DayOfWeek.MONDAY),
                org.assertj.core.groups.Tuple.tuple("programDays.lower_a.name", DayOfWeek.TUESDAY),
                org.assertj.core.groups.Tuple.tuple("programDays.upper_b.name", DayOfWeek.THURSDAY),
                org.assertj.core.groups.Tuple.tuple("programDays.lower_b.name", DayOfWeek.FRIDAY));
    }

    @Test
    void aMovesRepRangeFollowsItsKindAndEveryWorkSetAimsAtTheRirTarget() {
        List<ProgramGenerator.PlannedDay> program = ProgramGenerator.generate(
                EnumSet.of(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY), templates, catalog, P);
        assertThat(program).isNotEmpty();
        List<ProgramGenerator.Planned> upperA = program.getFirst().exercises();

        assertThat(upperA.getFirst()).isEqualTo(new ProgramGenerator.Planned("bench_press", 3,
                new RepRange(P.wholeNumber(ParameterKey.REP_RANGE_COMPOUND_MIN), P.wholeNumber(ParameterKey.REP_RANGE_COMPOUND_MAX)),
                P.wholeNumber(ParameterKey.TARGET_RIR_MAX)));
        assertThat(upperA).filteredOn(planned -> planned.exerciseId().equals("lateral_raise")).singleElement()
                .satisfies(raise -> assertThat(raise.reps()).isEqualTo(new RepRange(
                        P.wholeNumber(ParameterKey.REP_RANGE_ISOLATION_MIN), P.wholeNumber(ParameterKey.REP_RANGE_ISOLATION_MAX))));
    }

    @Test
    void everyDayCountFromOneToSixHasAProgram() {
        List<DayOfWeek> week = List.of(DayOfWeek.values());
        for (int days = 1; days <= 6; days++) {
            Set<DayOfWeek> chosen = EnumSet.copyOf(week.subList(0, days));
            assertThat(ProgramGenerator.generate(chosen, templates, catalog, P)).as(days + " days").hasSize(days);
        }
    }

    @Test
    void sevenDaysOrNoneIsNotAProgram() {
        // G1 K-70: rest days are part of the program; seven training days leave none.
        assertThatIllegalArgumentException().isThrownBy(() -> ProgramGenerator.generate(EnumSet.allOf(DayOfWeek.class), templates, catalog, P));
        assertThatIllegalArgumentException().isThrownBy(() -> ProgramGenerator.generate(EnumSet.noneOf(DayOfWeek.class), templates, catalog, P));
    }
}
