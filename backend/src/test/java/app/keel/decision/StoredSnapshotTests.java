package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.CheckIn;
import app.keel.engine.EnergyBudget;
import app.keel.engine.Phase;
import app.keel.engine.Profile;
import app.keel.engine.Sex;
import app.keel.engine.Snapshot;
import app.keel.engine.TrainingStatus;
import app.keel.engine.WeighIn;
import app.keel.engine.WeightSeries;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

/**
 * The Snapshot kept with its call (K-212, ADR-003 §6): every input comes back as it was, through JSON — except the
 * cycle answer, which is never kept (ADR-020 L-1).
 */
class StoredSnapshotTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final LocalDate TODAY = LocalDate.of(2026, 9, 28);

    @Test
    void everyInputComesBackThroughJson() throws Exception {
        Snapshot full = full(false);

        StoredSnapshot back = JSON.readValue(JSON.writeValueAsString(StoredSnapshot.of(full)), StoredSnapshot.class);

        assertThat(back.toSnapshot()).isEqualTo(full);
    }

    @Test
    void theCycleAnswerIsNeverKept() throws Exception {
        String json = JSON.writeValueAsString(StoredSnapshot.of(full(true)));

        assertThat(json).doesNotContainIgnoringCase("menstrual").doesNotContainIgnoringCase("cycle");
        assertThat(JSON.readValue(json, StoredSnapshot.class).toSnapshot()).isEqualTo(full(false));
    }

    @Test
    void anEmptyOptionalStaysEmpty() throws Exception {
        // One weigh-in and nothing optional: every Optional comes back empty, not as a default.
        Snapshot bare = new Snapshot(TODAY, Sex.FEMALE, Phase.BULK, TODAY.minusDays(14),
                new WeightSeries(List.of(new WeighIn(TODAY, new BigDecimal("61.3")))));

        assertThat(JSON.readValue(JSON.writeValueAsString(StoredSnapshot.of(bare)), StoredSnapshot.class).toSnapshot()).isEqualTo(bare);
    }

    @Test
    void anExerciseBurnNotKnownStaysNotKnownAndZeroStaysZero() throws Exception {
        // Made again from what was kept, a call must come out the same (K-212): unknown exercise read back as 0 would
        // give the safety net a band it did not have (K-216).
        for (EnergyBudget energy : List.of(EnergyBudget.exerciseUnknown(2200), new EnergyBudget(2200, 0))) {
            Snapshot snapshot = new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(14),
                    new WeightSeries(List.of(new WeighIn(TODAY, new BigDecimal("82.0"))))).withEnergy(energy);

            assertThat(JSON.readValue(JSON.writeValueAsString(StoredSnapshot.of(snapshot)), StoredSnapshot.class).toSnapshot().energy())
                    .contains(energy);
        }
    }

    private static Snapshot full(boolean menstrualLoss) {
        return new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(21),
                new WeightSeries(List.of(new WeighIn(TODAY.minusDays(2), new BigDecimal("82.4")), new WeighIn(TODAY, new BigDecimal("82.1")))),
                Optional.of(new BigDecimal("18.5")), Optional.of(new EnergyBudget(2200, 350)), menstrualLoss,
                new CheckIn(CheckIn.Look.BETTER, CheckIn.Training.STABLE, CheckIn.Recovery.GOOD, CheckIn.Waist.DOWN,
                        Optional.of(new BigDecimal("0.85")), CheckIn.Appetite.NORMAL),
                Optional.of(new Profile(30, 180)), true, TODAY.minusDays(60), Optional.of(new TrainingStatus(2, 1, 0, false, true, 1)));
    }
}
