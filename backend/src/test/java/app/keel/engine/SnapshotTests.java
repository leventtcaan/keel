package app.keel.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

/** The engine's only input. "Today" is part of it, so the engine never reads a clock (ADR-003). */
class SnapshotTests {

    private static final LocalDate MONDAY = LocalDate.of(2026, 9, 28);
    private static final WeightSeries NO_WEIGHINS = new WeightSeries(List.of());

    @Test
    void carriesTodayAndTheProfileBasics() {
        Snapshot snapshot = new Snapshot(MONDAY, Sex.MALE, Phase.CUT, MONDAY, NO_WEIGHINS);

        assertThat(snapshot.today()).isEqualTo(MONDAY);
        assertThat(snapshot.sex()).isEqualTo(Sex.MALE);
        assertThat(snapshot.phase()).isEqualTo(Phase.CUT);
    }

    @Test
    void rejectsMissingParts() {
        assertThatThrownBy(() -> new Snapshot(null, Sex.MALE, Phase.CUT, MONDAY, NO_WEIGHINS))
                .isInstanceOf(NullPointerException.class).hasMessageContaining("today");
        assertThatThrownBy(() -> new Snapshot(MONDAY, null, Phase.CUT, MONDAY, NO_WEIGHINS))
                .isInstanceOf(NullPointerException.class).hasMessageContaining("sex");
        assertThatThrownBy(() -> new Snapshot(MONDAY, Sex.MALE, null, MONDAY, NO_WEIGHINS))
                .isInstanceOf(NullPointerException.class).hasMessageContaining("phase");
    }

    @Test
    void rejectsMissingPlanStartOrWeights() {
        assertThatThrownBy(() -> new Snapshot(MONDAY, Sex.MALE, Phase.CUT, null, NO_WEIGHINS))
                .isInstanceOf(NullPointerException.class).hasMessageContaining("planStart");
        assertThatThrownBy(() -> new Snapshot(MONDAY, Sex.MALE, Phase.CUT, MONDAY, null))
                .isInstanceOf(NullPointerException.class).hasMessageContaining("weights");
    }

    @Test
    void rejectsDataFromTheFuture() {
        // "Today" is the engine's clock; a weigh-in or plan after it is a caller bug, not data.
        WeightSeries tomorrow = new WeightSeries(List.of(new WeighIn(MONDAY.plusDays(1), new java.math.BigDecimal("80"))));

        assertThatThrownBy(() -> new Snapshot(MONDAY, Sex.MALE, Phase.CUT, MONDAY, tomorrow))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("after today");
        assertThatThrownBy(() -> new Snapshot(MONDAY, Sex.MALE, Phase.CUT, MONDAY.plusDays(1), NO_WEIGHINS))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("after today");
    }

    @Test
    void twoSnapshotsWithTheSameContentAreEqual() {
        // Same input → same output needs "same input" to be checkable by value (ADR-003 §1, U2).
        assertThat(new Snapshot(MONDAY, Sex.FEMALE, Phase.BULK, MONDAY, NO_WEIGHINS)).isEqualTo(new Snapshot(MONDAY, Sex.FEMALE, Phase.BULK, MONDAY, NO_WEIGHINS));
    }
}
