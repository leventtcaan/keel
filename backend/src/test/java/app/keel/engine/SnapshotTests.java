package app.keel.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

/** The engine's only input. "Today" is part of it, so the engine never reads a clock (ADR-003). */
class SnapshotTests {

    private static final LocalDate MONDAY = LocalDate.of(2026, 9, 28);

    @Test
    void carriesTodayAndTheProfileBasics() {
        Snapshot snapshot = new Snapshot(MONDAY, Sex.MALE, Phase.CUT);

        assertThat(snapshot.today()).isEqualTo(MONDAY);
        assertThat(snapshot.sex()).isEqualTo(Sex.MALE);
        assertThat(snapshot.phase()).isEqualTo(Phase.CUT);
    }

    @Test
    void rejectsMissingParts() {
        assertThatThrownBy(() -> new Snapshot(null, Sex.MALE, Phase.CUT))
                .isInstanceOf(NullPointerException.class).hasMessageContaining("today");
        assertThatThrownBy(() -> new Snapshot(MONDAY, null, Phase.CUT))
                .isInstanceOf(NullPointerException.class).hasMessageContaining("sex");
        assertThatThrownBy(() -> new Snapshot(MONDAY, Sex.MALE, null))
                .isInstanceOf(NullPointerException.class).hasMessageContaining("phase");
    }

    @Test
    void twoSnapshotsWithTheSameContentAreEqual() {
        // Same input → same output needs "same input" to be checkable by value (ADR-003 §1, U2).
        assertThat(new Snapshot(MONDAY, Sex.FEMALE, Phase.BULK)).isEqualTo(new Snapshot(MONDAY, Sex.FEMALE, Phase.BULK));
    }
}
