package app.keel.engine;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.CheckIn.Week1Feel;
import app.keel.engine.FirstWeekAdjustment.Week;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import net.jqwik.api.statistics.Statistics;

/**
 * The first week's adjustment over any week (K-962, ADR-077 #4): the engine never proposes fewer training days than
 * training_days_min, nor fewer than the user has (ADR-071 #8); moving the missed sessions keeps the count; the feel answer
 * changes only the "add a day" row, and only where its question is asked; the same week gives the same call.
 */
class FirstWeekAdjustmentProperties {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static final LocalDate MONDAY = LocalDate.of(2026, 10, 12);
    private static final int FLOOR = P.wholeNumber(ParameterKey.TRAINING_DAYS_MIN);

    @Property
    void aProposedDayCountIsNeverUnderTheFloorNorUnderTheUsersOwn(@ForAll("weeks") Week week, @ForAll Week1Feel feel) {
        FirstWeekAdjustment.decide(week, feel, MONDAY, P).map(Decision::action).ifPresent(action -> {
            Statistics.collect(action.type());
            if (action instanceof Action.AddTrainingDay(int toDays, int idealDays)) {
                // One day more, never under the floor; toward the ideal, never past it.
                assertThat(toDays).isGreaterThanOrEqualTo(FLOOR).isGreaterThan(week.trainingDays()).isLessThanOrEqualTo(idealDays);
                assertThat(idealDays).isEqualTo(P.wholeNumber(ParameterKey.TRAINING_DAYS_IDEAL_MIN));
            } else {
                // The same plan, or the same days with the missed ones moved: never a day count of their own.
                assertThat(action).isInstanceOfAny(Action.Continue.class, Action.MoveMissedSessions.class);
            }
        });
    }

    @Property
    void theMissedSessionsMovedAreTheWeeksOwn(@ForAll("weeks") Week week, @ForAll Week1Feel feel) {
        FirstWeekAdjustment.decide(week, feel, MONDAY, P).map(Decision::action).ifPresent(action -> {
            if (action instanceof Action.MoveMissedSessions(List<DayOfWeek> missed)) {
                assertThat(missed).isEqualTo(week.missed()).isNotEmpty();
            }
        });
    }

    @Property
    void theFeelChangesOnlyTheAddADayRow(@ForAll("weeks") Week week, @ForAll Week1Feel feel) {
        Optional<Decision> answered = FirstWeekAdjustment.decide(week, feel, MONDAY, P);
        Optional<Decision> unanswered = FirstWeekAdjustment.decide(week, Week1Feel.UNKNOWN, MONDAY, P);
        boolean added = answered.map(Decision::action).filter(Action.AddTrainingDay.class::isInstance).isPresent();
        Statistics.collect(added ? "adds a day" : "the call without the answer");

        if (added) {
            assertThat(feel).isEqualTo(Week1Feel.COULD_DO_MORE);
            assertThat(FirstWeekAdjustment.feelCounts(week, P)).as("asked").isTrue();
        } else {
            // The same call; only its words may say "too much" back, and only where it was asked.
            assertThat(answered.map(Decision::action)).isEqualTo(unanswered.map(Decision::action));
            assertThat(answered.map(Decision::reasons)).isEqualTo(unanswered.map(Decision::reasons));
            if (!(feel == Week1Feel.TOO_MUCH && FirstWeekAdjustment.feelCounts(week, P))) {
                assertThat(answered).isEqualTo(unanswered);
            }
        }
        assertThat(added).as("asked and I could do more is the added day").isEqualTo(FirstWeekAdjustment.feelCounts(week, P) && feel == Week1Feel.COULD_DO_MORE);
    }

    @Property
    void whereTheFeelIsNotAskedItsAnswerChangesNothing(@ForAll("weeks") Week week, @ForAll Week1Feel feel) {
        if (!FirstWeekAdjustment.feelCounts(week, P)) {
            assertThat(FirstWeekAdjustment.decide(week, feel, MONDAY, P)).isEqualTo(FirstWeekAdjustment.decide(week, Week1Feel.UNKNOWN, MONDAY, P));
        }
    }

    @Property
    void theSameWeekGivesTheSameCall(@ForAll("weeks") Week week, @ForAll Week1Feel feel) {
        assertThat(FirstWeekAdjustment.decide(week, feel, MONDAY, P)).isEqualTo(FirstWeekAdjustment.decide(week, feel, MONDAY, P));
    }

    /** A week of one to seven days on the user's calendar: planned days, the ones with a session, a few extra sessions. */
    @Provide
    Arbitrary<Week> weeks() {
        Arbitrary<List<DayOfWeek>> plannedDays = Arbitraries.of(DayOfWeek.values()).set().ofMaxSize(7).map(days -> days.stream().sorted().toList());
        return Combinators.combine(plannedDays, Arbitraries.integers().between(0, 7), Arbitraries.integers().between(0, 2),
                Arbitraries.integers().between(1, 6), Arbitraries.of(Experience.values()).optional(0.8))
                .as((planned, skip, extra, days, experience) -> {
                    List<DayOfWeek> missed = new ArrayList<>(planned.subList(0, Math.min(skip, planned.size())));
                    int done = planned.size() - missed.size() + extra;
                    return new Week(planned.size(), done, Math.max(days, planned.isEmpty() ? 0 : 1), missed, experience);
                });
    }
}
