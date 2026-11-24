package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** What a held-back call shows an account without the subscription (ADR-091 Ek 1, K-1201): its week and the next call's day, nothing it says. */
class LockedCallViewTests {

    @Test
    void itNamesTheWeekAndTheNextCallDayAndNothingMore() {
        UUID id = UUID.randomUUID();

        assertThat(LockedCall.view(id, LocalDate.of(2026, 12, 2), LocalDate.of(2026, 11, 30), LocalDate.of(2026, 12, 7)))
                .containsOnlyKeys("id", "madeOn", "weekOf", "nextCallOn", "locked")
                .containsEntry("id", id).containsEntry("madeOn", LocalDate.of(2026, 12, 2)).containsEntry("weekOf", LocalDate.of(2026, 11, 30))
                .containsEntry("nextCallOn", LocalDate.of(2026, 12, 7)).containsEntry("locked", true);
    }
}
