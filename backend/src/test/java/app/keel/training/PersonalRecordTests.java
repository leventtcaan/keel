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
 * A record (ADR-075 #7): a real (working) set that beats every earlier set of its move — at least as heavy with at least
 * as many reps, and not the same set. The first session of a move is its baseline. No estimated max (B10).
 */
class PersonalRecordTests {

    private static final Instant BEFORE = Instant.parse("2026-10-01T08:00:00Z");
    private static final Instant TODAY = Instant.parse("2026-10-08T08:00:00Z");

    @ParameterizedTest(name = "{0}×{1} against {2}×{3}: {4}")
    @CsvSource({
            // More load at the same reps, or more: double progression's added load (K-109) once the reps hold.
            "102.5, 8, 100, 8, true",
            "102.5, 9, 100, 8, true",
            // The same load with more reps: double progression's added rep.
            "100, 9, 100, 8, true",
            // A tie is not a record.
            "100, 8, 100, 8, false",
            // More load with fewer reps, or fewer reps at the same load, or less load: not beaten without an estimated max.
            "105, 6, 100, 8, false",
            "100, 7, 100, 8, false",
            "97.5, 12, 100, 8, false"})
    void aSetBeatsAnotherAtLeastAsHeavyWithAtLeastAsManyRepsAndNotTheSame(String kg, int reps, String otherKg, int otherReps, boolean beats) {
        assertThat(PersonalRecords.beats(set(TODAY, kg, reps, 1), set(BEFORE, otherKg, otherReps, 1))).isEqualTo(beats);
    }

    @Test
    void theFirstSessionOfAMoveIsItsBaselineItsBestSet() {
        Optional<PersonalRecords.Mark> mark = PersonalRecords.of(List.of(),
                List.of(set(TODAY, "60", 10, 2), set(TODAY, "62.5", 8, 1), set(TODAY, "62.5", 8, 0), set(TODAY, "62.5", 7, 0)));

        assertThat(mark).contains(new PersonalRecords.Mark(PersonalRecords.Kind.BASELINE, set(TODAY, "62.5", 8, 0)));
    }

    @Test
    void aRecordBeatsEveryEarlierSetAndTheSessionsLastRecordIsTheOne() {
        List<TrainingLog.WorkSet> earlier = List.of(set(BEFORE, "100", 8, 1), set(BEFORE, "100", 7, 0));

        // 100×9 beats both; then 102.5×9 beats it too: the last set that beats everything before it.
        assertThat(PersonalRecords.of(earlier, List.of(set(TODAY, "100", 9, 1), set(TODAY, "102.5", 9, 0), set(TODAY, "102.5", 8, 0))))
                .contains(new PersonalRecords.Mark(PersonalRecords.Kind.RECORD, set(TODAY, "102.5", 9, 0)));
    }

    @Test
    void anEarlierSetOfTheSameSessionCountsAsEarlier() {
        // 100×9 is a record; a second 100×9 ties it and is not a second one.
        assertThat(PersonalRecords.of(List.of(set(BEFORE, "100", 8, 1)), List.of(set(TODAY, "100", 9, 1), set(TODAY, "100", 9, 0))))
                .contains(new PersonalRecords.Mark(PersonalRecords.Kind.RECORD, set(TODAY, "100", 9, 1)));
    }

    @Test
    void aTieOrAHeavierSetWithFewerRepsIsNoRecord() {
        List<TrainingLog.WorkSet> earlier = List.of(set(BEFORE, "80", 10, 1), set(BEFORE, "85", 6, 1));

        assertThat(PersonalRecords.of(earlier, List.of(set(TODAY, "85", 6, 1)))).as("a tie").isEmpty();
        // 85×8 beats 85×6 but not 80×10: every earlier set, not just the heaviest.
        assertThat(PersonalRecords.of(earlier, List.of(set(TODAY, "85", 8, 1)))).as("fewer reps than a lighter set").isEmpty();
        assertThat(PersonalRecords.of(earlier, List.of(set(TODAY, "85", 10, 1)))).isPresent();
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
                set(TODAY, "80", 10, 1), set(TODAY, "85", 6, 1), set(third, "82.5", 10, 1), set(third, "85", 10, 1));

        assertThat(PersonalRecords.best(history)).contains(new PersonalRecords.Mark(PersonalRecords.Kind.RECORD, set(third, "85", 10, 1)));
        assertThat(PersonalRecords.best(history.subList(0, 2))).contains(new PersonalRecords.Mark(PersonalRecords.Kind.BASELINE,
                set(BEFORE, "80", 8, 1)));
        assertThat(PersonalRecords.best(List.of())).isEmpty();
    }

    static TrainingLog.WorkSet set(Instant at, String kg, int reps, Integer rir) {
        return new TrainingLog.WorkSet("bench_press", at, ExerciseCatalog.Load.EXTERNAL, new BigDecimal(kg), reps, rir, null);
    }
}
