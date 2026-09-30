package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * The deload ladder's calls on the program (K-217, K-110, G7 K-68): hold the load, a lighter week, a week off. Each is a
 * change with its days; the program reads the ones in force today.
 */
class ApplyTrainingDecisionTests {

    private static final LocalDate MONDAY = LocalDate.of(2026, 10, 5);

    @Test
    void aChangeIsInForceFromItsFirstDayToItsLastIncluded() {
        TrainingChanges.Change lighter = lighter(MONDAY, MONDAY.plusDays(6), "0.5");

        assertThat(TrainingChanges.inForce(List.of(lighter), TrainingChanges.Kind.LIGHTER_WEEK, MONDAY.minusDays(1))).isEmpty();
        assertThat(TrainingChanges.inForce(List.of(lighter), TrainingChanges.Kind.LIGHTER_WEEK, MONDAY)).contains(lighter);
        assertThat(TrainingChanges.inForce(List.of(lighter), TrainingChanges.Kind.LIGHTER_WEEK, MONDAY.plusDays(6))).contains(lighter);
        assertThat(TrainingChanges.inForce(List.of(lighter), TrainingChanges.Kind.LIGHTER_WEEK, MONDAY.plusDays(7))).as("ends on its own").isEmpty();
    }

    @Test
    void holdingTheLoadHasNoLastDayOfItsOwn() {
        TrainingChanges.Change hold = new TrainingChanges.Change(UUID.randomUUID(), TrainingChanges.Kind.HOLD_LOAD, MONDAY, null, null);

        assertThat(TrainingChanges.inForce(List.of(hold), TrainingChanges.Kind.HOLD_LOAD, MONDAY.plusWeeks(5))).contains(hold);
        assertThat(TrainingChanges.inForce(List.of(hold), TrainingChanges.Kind.LIGHTER_WEEK, MONDAY)).as("another kind").isEmpty();
    }

    @Test
    void aLighterWeekScalesTheSetsDownAndNeverToNone() {
        // "Halve the volume" (G7 K-68): rounded down — the week is for recovering — but never under one set.
        TrainingChanges.Change half = lighter(MONDAY, MONDAY.plusDays(6), "0.5");

        assertThat(TrainingChanges.sets(4, java.util.Optional.of(half))).isEqualTo(2);
        assertThat(TrainingChanges.sets(3, java.util.Optional.of(half))).isEqualTo(1);
        assertThat(TrainingChanges.sets(1, java.util.Optional.of(half))).isEqualTo(1);
        assertThat(TrainingChanges.sets(3, java.util.Optional.empty())).as("no lighter week").isEqualTo(3);
    }

    @Test
    void theNextRungEndsTheHold() {
        // Holding the load was the first rung; a lighter week or a week off replaces it (K-110), from the day before.
        TrainingChanges.Change hold = new TrainingChanges.Change(UUID.randomUUID(), TrainingChanges.Kind.HOLD_LOAD, MONDAY.minusWeeks(2), null, null);

        assertThat(TrainingChanges.holdEndsBefore(MONDAY)).isEqualTo(MONDAY.minusDays(1));
        assertThat(TrainingChanges.inForce(List.of(new TrainingChanges.Change(hold.callId(), hold.kind(), hold.startsOn(), TrainingChanges.holdEndsBefore(MONDAY),
                null)), TrainingChanges.Kind.HOLD_LOAD, MONDAY)).isEmpty();
    }

    private static TrainingChanges.Change lighter(LocalDate from, LocalDate until, String factor) {
        return new TrainingChanges.Change(UUID.randomUUID(), TrainingChanges.Kind.LIGHTER_WEEK, from, until, new BigDecimal(factor));
    }
}
