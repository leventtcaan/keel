package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.constraints.IntRange;
import org.junit.jupiter.api.Test;

/** The rest before a set (K-1214), without a database: none, or whole seconds from 0 to the ceiling; never negative. */
class RestSecondsTests {

    private static final int CEILING = 7200;
    private static final WorkoutController.TrainingLimits LIMITS = new WorkoutController.TrainingLimits(new BigDecimal("1000"), 100, 10, 20,
            20, 60, 5, CEILING);

    @Test
    void noRestIsFine() {
        assertThat(LIMITS.restSeconds(null)).isTrue();
    }

    @Test
    void theEdgesOfTheRangeAreIn() {
        assertThat(LIMITS.restSeconds(0)).isTrue();
        assertThat(LIMITS.restSeconds(CEILING)).isTrue();
        assertThat(LIMITS.restSeconds(CEILING + 1)).isFalse();
        assertThat(LIMITS.restSeconds(-1)).isFalse();
    }

    @Property
    void aNegativeRestIsNeverAccepted(@ForAll @IntRange(min = Integer.MIN_VALUE, max = -1) int seconds) {
        assertThat(LIMITS.restSeconds(seconds)).isFalse();
    }

    @Property
    void aRestIsAcceptedExactlyWithinTheCeiling(@ForAll int seconds) {
        assertThat(LIMITS.restSeconds(seconds)).isEqualTo(seconds >= 0 && seconds <= CEILING);
    }
}
