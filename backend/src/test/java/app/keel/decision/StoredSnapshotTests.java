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
    void theSafetyHoldIsKeptButTheResolvedAnswerIsNot() throws Exception {
        // K-229: the hold (after a hard stop) is an input the call must be made again with; the answer "not stopped" is
        // health data never kept (ADR-027 #18), like the cycle answer.
        String json = JSON.writeValueAsString(StoredSnapshot.of(full(false).withSafetyHold(true).withCycleResolved(true)));

        assertThat(json).doesNotContainIgnoringCase("cycle").doesNotContainIgnoringCase("resolved");
        assertThat(JSON.readValue(json, StoredSnapshot.class).toSnapshot()).isEqualTo(full(false).withSafetyHold(true));
    }

    @Test
    void aCallKeptBeforeTheHoldExistedReadsAsNotHeld() throws Exception {
        String json = JSON.writeValueAsString(StoredSnapshot.of(full(false))).replace(",\"safetyHold\":false", "");

        assertThat(json).doesNotContain("safetyHold");
        assertThat(JSON.readValue(json, StoredSnapshot.class).toSnapshot()).isEqualTo(full(false));
    }

    @Test
    void theMiniCutsDayIsKeptAndACallKeptBeforeItReadsAsNoMiniCut() throws Exception {
        // K-227: the call is made again the same only with the day the mini cut ends.
        Snapshot onIt = full(false).withMiniCutUntil(TODAY.plusWeeks(2));
        assertThat(JSON.readValue(JSON.writeValueAsString(StoredSnapshot.of(onIt)), StoredSnapshot.class).toSnapshot()).isEqualTo(onIt);

        String before = JSON.writeValueAsString(StoredSnapshot.of(full(false))).replace(",\"miniCutUntil\":null", "");
        assertThat(before).doesNotContain("miniCutUntil");
        assertThat(JSON.readValue(before, StoredSnapshot.class).toSnapshot()).isEqualTo(full(false));
    }

    @Test
    void twoFatEstimatesComeBackBoth() throws Exception {
        Snapshot two = full(false).withFatProxy(new BigDecimal("15"), new BigDecimal("32.2"));

        assertThat(JSON.readValue(JSON.writeValueAsString(StoredSnapshot.of(two)), StoredSnapshot.class).toSnapshot()).isEqualTo(two);
    }

    @Test
    void aCallKeptWithOneFatEstimateReadsItForBoth() throws Exception {
        // Calls kept before the higher estimate (K-224 review) were made on one number for every rule: made again, the same.
        String json = JSON.writeValueAsString(StoredSnapshot.of(full(false))).replace(",\"fatProxyHighPct\":18.5", "");

        assertThat(JSON.readValue(json, StoredSnapshot.class).toSnapshot()).isEqualTo(full(false));
    }

    @Test
    void theLowEnergyEndComesBackAndACallKeptBeforeItReadsTheLower() throws Exception {
        // K-230: the call is made again the same only with the end the low-energy rule read.
        Snapshot three = full(false).withFatProxy(new BigDecimal("15"), new BigDecimal("32.2"), new BigDecimal("10"));
        assertThat(JSON.readValue(JSON.writeValueAsString(StoredSnapshot.of(three)), StoredSnapshot.class).toSnapshot()).isEqualTo(three);

        String before = JSON.writeValueAsString(StoredSnapshot.of(full(false))).replaceAll(",\"fatProxyEnergyPct\":[^,}]*", "");
        assertThat(before).doesNotContain("fatProxyEnergyPct");
        assertThat(JSON.readValue(before, StoredSnapshot.class).toSnapshot()).isEqualTo(full(false));
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
