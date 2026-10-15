package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.Parameters;
import app.keel.engine.RepositoryParameters;
import app.keel.engine.Sex;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/**
 * Back after a long break (K-531, ADR-043 #75), the one reading of it the program and the call's held move share
 * (K-1009): a target from before today is shown a step lighter on a day back after a long break, and that comes before any
 * hold of the load, so the hold changes nothing there.
 */
class BackAfterBreakTests {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 14);
    private static final ZoneId ZONE = ZoneOffset.UTC;

    @Test
    void aLongBreakIsTheLastSessionBeforeTodayAFewWeeksAgo() {
        assertThat(BackAfterBreak.of(Optional.of(TODAY.minusDays(60)), TODAY, ZONE, P).longBreak()).isTrue();
        assertThat(BackAfterBreak.of(Optional.of(TODAY.minusDays(3)), TODAY, ZONE, P).longBreak()).isFalse();
        assertThat(BackAfterBreak.of(Optional.empty(), TODAY, ZONE, P).longBreak()).as("no session yet").isFalse();
    }

    @Test
    void aTargetFromBeforeTodayIsSteppedBackOnADayBackAfterALongBreak() {
        BackAfterBreak back = BackAfterBreak.of(Optional.of(TODAY.minusDays(60)), TODAY, ZONE, P);

        assertThat(back.steppedBack(target("72.5", "72.5", TODAY.minusDays(60)))).isTrue();
        assertThat(back.steppedBack(target("72.5", "72.5", TODAY))).as("the session back wrote it today: its own, not stepped back again").isFalse();
        assertThat(back.steppedBack(target("72.5", null, null))).as("never lifted: nothing to step back from").isFalse();
        assertThat(back.steppedBack(new ProgramStore.PlannedExercise("bench_press", 3, 6, 8, 2))).as("no target").isFalse();
    }

    @Test
    void withoutALongBreakNoTargetIsSteppedBack() {
        assertThat(BackAfterBreak.of(Optional.of(TODAY.minusDays(3)), TODAY, ZONE, P).steppedBack(target("72.5", "72.5", TODAY.minusDays(3)))).isFalse();
    }

    private static ProgramStore.PlannedExercise target(String next, String last, LocalDate from) {
        Instant at = from == null ? null : from.atStartOfDay(ZONE).toInstant();
        return new ProgramStore.PlannedExercise("bench_press", 3, 6, 8, 2, new BigDecimal(next), 8, last == null ? null : new BigDecimal(last), null, at,
                false);
    }
}
