package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/** Whether an edit of a session can move a target of its day (K-432): as setNext decides, per move. */
class TargetSourcesTests {

    private static final Instant SESSION = Instant.parse("2026-09-21T17:00:00Z");

    @Test
    void aTargetFromThisSessionOrAnOlderOneMoves() {
        assertThat(ProgramStore.movesATarget(List.of(Optional.of(SESSION)), SESSION)).isTrue();
        assertThat(ProgramStore.movesATarget(List.of(Optional.of(SESSION.minusSeconds(1))), SESSION)).isTrue();
    }

    @Test
    void aMoveWithNoTargetYetMoves() {
        assertThat(ProgramStore.movesATarget(List.of(Optional.of(SESSION.plusSeconds(1)), Optional.empty()), SESSION)).isTrue();
    }

    @Test
    void everyTargetFromANewerSessionOrNoMovesAtAllDoesNot() {
        assertThat(ProgramStore.movesATarget(List.of(Optional.of(SESSION.plusSeconds(1))), SESSION)).isFalse();
        assertThat(ProgramStore.movesATarget(List.of(), SESSION)).isFalse();
    }
}
