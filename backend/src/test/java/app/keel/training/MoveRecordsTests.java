package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.Parameters;
import app.keel.engine.RepositoryParameters;
import app.keel.engine.Sex;
import app.keel.training.ExerciseCatalog.Kind;
import app.keel.training.ExerciseCatalog.Load;
import app.keel.training.MoveRecords.Done;
import app.keel.training.MoveRecords.Record;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * A move's records of all time from its working sets (K-1259, ADR-096, ADR-033 §3): the rules the phone kept (train/history.ts
 * recordsOf), now on the server so a record does not fall out of a year's window.
 */
class MoveRecordsTests {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static final Instant FIRST = Instant.parse("2026-09-10T17:00:00Z");
    private static final Instant SECOND = Instant.parse("2026-09-11T17:00:00Z");

    private static Done done(String kg, int reps, Integer rir, Instant on) {
        return new Done(new BigDecimal(kg), reps, rir, on);
    }

    private static Record record(MoveRecords.Kind kind, String loadKg, Integer reps, String kg, Instant on) {
        return new Record(kind, loadKg == null ? null : new BigDecimal(loadKg), reps, kg == null ? null : new BigDecimal(kg), on);
    }

    @Test
    void aCompoundMoveWithALoadHasItsHeaviestItsEstimatedMaxAndItsMostRepsAtEachLoad() {
        List<Record> records = MoveRecords.of(Kind.COMPOUND, Load.EXTERNAL,
                List.of(done("80", 8, 1, FIRST), done("80", 9, 0, FIRST), done("85", 4, 2, SECOND)), P);

        assertThat(records).containsExactly(
                record(MoveRecords.Kind.HEAVIEST, "85", 4, null, SECOND),
                // 80 × 9 at RIR 0 is 104 (Epley, the engine's); 85 × 4 at RIR 2 is 102.
                record(MoveRecords.Kind.ESTIMATED_MAX, null, null, "104.0", FIRST),
                record(MoveRecords.Kind.REPS_AT, "85", 4, null, SECOND),
                record(MoveRecords.Kind.REPS_AT, "80", 9, null, FIRST));
    }

    @Test
    void anIsolationMoveHasOnlyItsMostRepsAtEachLoad() {
        assertThat(MoveRecords.of(Kind.ISOLATION, Load.EXTERNAL,
                List.of(done("12.5", 12, 1, FIRST), done("15", 10, 1, SECOND), done("12.5", 14, 1, SECOND)), P)).containsExactly(
                        record(MoveRecords.Kind.REPS_AT, "15", 10, null, SECOND),
                        record(MoveRecords.Kind.REPS_AT, "12.5", 14, null, SECOND));
    }

    @Test
    void aBodyweightMoveHasItsMostReps() {
        assertThat(MoveRecords.of(Kind.COMPOUND, Load.BODYWEIGHT, List.of(done("0", 18, 1, FIRST), done("0", 22, 1, SECOND)), P))
                .containsExactly(record(MoveRecords.Kind.MOST_REPS, null, 22, null, SECOND));
    }

    @Test
    void aWeightedBodyweightMoveHasItsHeaviestAddedAndItsMostRepsWithTheBodyAlone() {
        assertThat(MoveRecords.of(Kind.COMPOUND, Load.BODYWEIGHT_PLUS_EXTERNAL,
                List.of(done("0", 12, 1, FIRST), done("10", 8, 1, FIRST), done("15", 5, 2, SECOND)), P)).containsExactly(
                        record(MoveRecords.Kind.HEAVIEST, "15", 5, null, SECOND),
                        record(MoveRecords.Kind.MOST_REPS, null, 12, null, FIRST));
    }

    @Test
    void aTieKeepsTheFirstTimeItWasDoneTheSameTopLoadForMoreRepsLaterIsTheHeaviest() {
        assertThat(MoveRecords.of(Kind.COMPOUND, Load.EXTERNAL, List.of(done("80", 8, null, FIRST), done("80", 8, null, SECOND)), P))
                .containsExactly(record(MoveRecords.Kind.HEAVIEST, "80", 8, null, FIRST), record(MoveRecords.Kind.REPS_AT, "80", 8, null, FIRST));
        assertThat(MoveRecords.of(Kind.COMPOUND, Load.EXTERNAL, List.of(done("85", 4, null, FIRST), done("85", 5, null, SECOND)), P).getFirst())
                .isEqualTo(record(MoveRecords.Kind.HEAVIEST, "85", 5, null, SECOND));
        // 80 × 8 at RIR 1 and 80 × 9 at RIR 0 are both 104: the first day keeps it.
        assertThat(MoveRecords.of(Kind.COMPOUND, Load.EXTERNAL, List.of(done("80", 8, 1, FIRST), done("80", 9, 0, SECOND)), P))
                .contains(record(MoveRecords.Kind.ESTIMATED_MAX, null, null, "104.0", FIRST));
    }

    @Test
    void loadsCompareAsNumbersNotAsTheirScale() {
        assertThat(MoveRecords.of(Kind.ISOLATION, Load.EXTERNAL, List.of(done("20.0", 10, null, FIRST), done("20", 12, null, SECOND)), P))
                .containsExactly(record(MoveRecords.Kind.REPS_AT, "20", 12, null, SECOND));
    }

    @Test
    void aRecordOfLongAgoHoldsWhateverCameSince() {
        Instant longAgo = SECOND.minus(Duration.ofDays(500));
        assertThat(MoveRecords.of(Kind.COMPOUND, Load.BODYWEIGHT, List.of(done("0", 30, 1, longAgo), done("0", 20, 1, SECOND)), P))
                .containsExactly(record(MoveRecords.Kind.MOST_REPS, null, 30, null, longAgo));
    }

    @Test
    void noWorkingSetsNoRecords() {
        assertThat(MoveRecords.of(Kind.COMPOUND, Load.EXTERNAL, List.of(), P)).isEmpty();
    }
}
