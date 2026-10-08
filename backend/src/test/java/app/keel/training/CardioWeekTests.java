package app.keel.training;

import static java.time.DayOfWeek.FRIDAY;
import static java.time.DayOfWeek.MONDAY;
import static java.time.DayOfWeek.SATURDAY;
import static java.time.DayOfWeek.THURSDAY;
import static java.time.DayOfWeek.WEDNESDAY;
import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.ActivityLevel;
import app.keel.engine.CardioOrigin;
import app.keel.engine.CardioPlacement;
import app.keel.engine.CardioPrescription;
import app.keel.engine.CardioSession;
import app.keel.engine.Parameters;
import app.keel.engine.Phase;
import app.keel.engine.RepositoryParameters;
import app.keel.engine.Sex;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * Which cardio the program carries this week (K-959, ADR-074): the user's own, never overwritten by a new program or a new
 * phase (#4), else the engine's default for the phase in force on the program's training days (#1), and the week it is
 * counted in. Expected weeks are today's cardio.yaml: a cut 3-5 × 30 min, a gaining phase 2 × 20 min, after the weights.
 */
class CardioWeekTests {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static final Optional<ActivityLevel> DESK = Optional.of(ActivityLevel.INACTIVE);
    private static final CardioPrescription OWN = CardioPrescription.user(45, List.of(new CardioSession(SATURDAY, CardioPlacement.OFF_DAY_LOW_INTENSITY)));

    @Test
    void theTrainingDaysAreTheProgramsWeekdays() {
        assertThat(CardioWeek.trainingDays(program(MONDAY, WEDNESDAY, FRIDAY), Set.of(THURSDAY))).containsExactlyInAnyOrder(MONDAY, WEDNESDAY, FRIDAY);
    }

    @Test
    void aProgramWithoutWeekdaysTrainsOnTheProfilesDays() {
        // An own program whose days float (K-527): the days the user said they train.
        assertThat(CardioWeek.trainingDays(program(null, null), Set.of(MONDAY, THURSDAY))).containsExactlyInAnyOrder(MONDAY, THURSDAY);
    }

    @Test
    void theUsersOwnCardioIsKeptWhateverThePhaseAndTheDays() {
        assertThat(CardioWeek.prescription(Optional.of(OWN), Optional.of(Phase.CUT), Set.of(MONDAY, WEDNESDAY, FRIDAY), DESK, P)).contains(OWN);
        assertThat(CardioWeek.prescription(Optional.of(OWN), Optional.of(Phase.BULK), Set.of(), DESK, P)).contains(OWN);
        assertThat(CardioWeek.prescription(Optional.of(OWN), Optional.empty(), Set.of(), Optional.empty(), P)).contains(OWN);
    }

    @Test
    void withoutTheUsersOwnTheDefaultFollowsThePhaseInForce() {
        CardioPrescription cut = CardioWeek.prescription(Optional.empty(), Optional.of(Phase.CUT), Set.of(MONDAY, WEDNESDAY, FRIDAY), DESK, P).orElseThrow();
        CardioPrescription gain = CardioWeek.prescription(Optional.empty(), Optional.of(Phase.BULK), Set.of(MONDAY, WEDNESDAY, FRIDAY), DESK, P).orElseThrow();

        assertThat(cut.origin()).isEqualTo(CardioOrigin.GENERATED);
        assertThat(cut.minutes()).isEqualTo(30);
        assertThat(cut.sessions()).containsExactly(after(MONDAY), after(WEDNESDAY), after(FRIDAY));
        assertThat(gain.minutes()).isEqualTo(20);
        assertThat(gain.sessions()).containsExactly(after(MONDAY), after(WEDNESDAY));
    }

    @Test
    void withoutAPhaseNorTheUsersOwnThereIsNoCardio() {
        assertThat(CardioWeek.prescription(Optional.empty(), Optional.empty(), Set.of(MONDAY, WEDNESDAY, FRIDAY), DESK, P)).isEmpty();
    }

    @Test
    void theWeekRunsMondayToSundayAsTheWeeklyConsistencyCounts() {
        assertThat(CardioWeek.weekOf(LocalDate.of(2026, 10, 11))).isEqualTo(LocalDate.of(2026, 10, 5));
        assertThat(CardioWeek.weekOf(LocalDate.of(2026, 10, 5))).isEqualTo(LocalDate.of(2026, 10, 5));
        assertThat(CardioWeek.weekOf(LocalDate.of(2026, 10, 12))).isEqualTo(LocalDate.of(2026, 10, 12));
    }

    private static CardioSession after(DayOfWeek day) {
        return new CardioSession(day, CardioPlacement.AFTER_LIFT);
    }

    private static ProgramStore.Program program(DayOfWeek... weekdays) {
        return new ProgramStore.Program(UUID.randomUUID(), ProgramStore.Source.OWN, Arrays.stream(weekdays)
                .map(day -> new ProgramStore.Day(UUID.randomUUID(), null, "Day", day, List.of())).toList());
    }
}
