package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * A record (ADR-075 #7 and Ek 2): a real (working) set that no earlier working set of its move dominates —
 * none at least as heavy with at least as many reps. A tie is dominated, so it is no record. The first session of a move
 * is its baseline. No estimated max (B10).
 */
class PersonalRecordTests {

    private static final Instant BEFORE = Instant.parse("2026-10-01T08:00:00Z");
    private static final Instant TODAY = Instant.parse("2026-10-08T08:00:00Z");

    @ParameterizedTest(name = "{2}×{3} dominates {0}×{1}: {4}")
    @CsvSource({
            // An earlier set at least as heavy with at least as many reps: the set is no record (a tie included).
            "100, 8, 100, 8, true",
            "100, 8, 100, 9, true",
            "100, 8, 102.5, 8, true",
            "97.5, 12, 100, 12, true",
            // Heavier than anything before (at fewer reps), or more reps than anything as heavy: undominated.
            "85, 8, 80, 10, false",
            "80, 11, 80, 10, false",
            "100, 9, 100, 8, false",
            "102.5, 6, 100, 8, false"})
    void aSetIsDominatedByAnEarlierOneAtLeastAsHeavyWithAtLeastAsManyReps(String kg, int reps, String otherKg, int otherReps, boolean dominated) {
        assertThat(PersonalRecords.dominates(set(BEFORE, otherKg, otherReps, 1), set(TODAY, kg, reps, 1))).isEqualTo(dominated);
    }

    @Test
    void theFirstSessionOfAMoveIsItsBaselineItsBestSet() {
        Optional<PersonalRecords.Mark> mark = PersonalRecords.of(List.of(),
                List.of(set(TODAY, "60", 10, 2), set(TODAY, "62.5", 8, 1), set(TODAY, "62.5", 8, 0), set(TODAY, "62.5", 7, 0)));

        assertThat(mark).contains(new PersonalRecords.Mark(PersonalRecords.Kind.BASELINE, set(TODAY, "62.5", 8, 0)));
    }

    @Test
    void theFirstTimeAtAHeavierLoadIsARecordAndSoAreMoreRepsAtALoad() {
        List<TrainingLog.WorkSet> earlier = List.of(set(BEFORE, "80", 10, 1), set(BEFORE, "80", 9, 0));

        assertThat(PersonalRecords.of(earlier, List.of(set(TODAY, "85", 8, 1))))
                .contains(new PersonalRecords.Mark(PersonalRecords.Kind.RECORD, set(TODAY, "85", 8, 1)));
        assertThat(PersonalRecords.of(earlier, List.of(set(TODAY, "80", 11, 1))))
                .contains(new PersonalRecords.Mark(PersonalRecords.Kind.RECORD, set(TODAY, "80", 11, 1)));
        assertThat(PersonalRecords.of(earlier, List.of(set(TODAY, "80", 10, 0)))).as("a tie").isEmpty();
        assertThat(PersonalRecords.of(earlier, List.of(set(TODAY, "77.5", 10, 1)))).as("lighter at the same reps").isEmpty();
    }

    @Test
    void anOldLightSetWithManyRepsNeverBlocksAHeavierOne() {
        assertThat(PersonalRecords.of(List.of(set(BEFORE, "60", 15, 1), set(BEFORE, "80", 8, 1)), List.of(set(TODAY, "82.5", 6, 1))))
                .map(PersonalRecords.Mark::kind).contains(PersonalRecords.Kind.RECORD);
    }

    @Test
    void anEarlierSetOfTheSameSessionCountsAsEarlierAndTheHeaviestRecordIsTheSessions() {
        List<TrainingLog.WorkSet> earlier = List.of(set(BEFORE, "100", 8, 1));

        // 100×9 is a record; a second 100×9 ties it and is not a second one.
        assertThat(PersonalRecords.of(earlier, List.of(set(TODAY, "100", 9, 1), set(TODAY, "100", 9, 0))))
                .contains(new PersonalRecords.Mark(PersonalRecords.Kind.RECORD, set(TODAY, "100", 9, 1)));
        // 102.5×6 and then 100×10 are both records; the session shows its heaviest.
        assertThat(PersonalRecords.of(earlier, List.of(set(TODAY, "102.5", 6, 1), set(TODAY, "100", 10, 0), set(TODAY, "100", 7, 0))))
                .contains(new PersonalRecords.Mark(PersonalRecords.Kind.RECORD, set(TODAY, "102.5", 6, 1)));
    }

    @Test
    void aSetOfNoRepsIsNoSetDone() {
        assertThat(PersonalRecords.of(List.of(set(BEFORE, "100", 8, 1)), List.of(set(TODAY, "120", 0, null)))).isEmpty();
        assertThat(PersonalRecords.of(List.of(), List.of(set(TODAY, "120", 0, null)))).as("nothing to be a baseline").isEmpty();
    }

    @Test
    void theBestSetIsTheLastRecordOrElseTheBaseline() {
        Instant third = TODAY.plusSeconds(86_400);
        List<TrainingLog.WorkSet> history = List.of(set(BEFORE, "80", 8, 1), set(BEFORE, "80", 7, 0),
                set(TODAY, "80", 10, 1), set(TODAY, "85", 6, 1), set(third, "82.5", 6, 1), set(third, "85", 7, 1));

        assertThat(PersonalRecords.best(history)).contains(new PersonalRecords.Mark(PersonalRecords.Kind.RECORD, set(third, "85", 7, 1)));
        assertThat(PersonalRecords.best(history.subList(0, 2))).contains(new PersonalRecords.Mark(PersonalRecords.Kind.BASELINE,
                set(BEFORE, "80", 8, 1)));
        assertThat(PersonalRecords.best(List.of())).isEmpty();
    }

    static TrainingLog.WorkSet set(Instant at, String kg, int reps, Integer rir) {
        return new TrainingLog.WorkSet("bench_press", at, ExerciseCatalog.Load.EXTERNAL, new BigDecimal(kg), reps, rir, null);
    }
}
