package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.DeclaredContext;
import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import app.keel.engine.RepositoryParameters;
import app.keel.engine.Sex;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

/**
 * A busy week's least dose with the declared state (K-528, ADR-038 #7, H9 §2): with BUSY only, by the user's age on the
 * day — the older dose from busy_min_older_age.
 */
class BusyDoseTests {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 3);
    private static final int OLDER = P.wholeNumber(ParameterKey.BUSY_MIN_OLDER_AGE);

    @Test
    void aBusyWeekCarriesItsDose() {
        assertThat(StateController.busyDose(DeclaredContext.BUSY, TODAY.getYear() - 30, TODAY, P))
                .contains(new StateController.BusyDose(1, 1, true));
    }

    @Test
    void fromTheOlderAgeTheOlderDose() {
        assertThat(StateController.busyDose(DeclaredContext.BUSY, TODAY.getYear() - OLDER, TODAY, P))
                .contains(new StateController.BusyDose(2, 2, true));
        assertThat(StateController.busyDose(DeclaredContext.BUSY, TODAY.getYear() - OLDER + 1, TODAY, P))
                .contains(new StateController.BusyDose(1, 1, true));
    }

    @Test
    void noOtherStateHasOne() {
        for (DeclaredContext kind : DeclaredContext.values()) {
            if (kind != DeclaredContext.BUSY) {
                assertThat(StateController.busyDose(kind, TODAY.getYear() - 30, TODAY, P)).as(kind.name()).isEmpty();
            }
        }
    }
}
