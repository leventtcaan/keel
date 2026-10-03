package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.constraints.BigRange;
import net.jqwik.api.constraints.IntRange;
import net.jqwik.api.constraints.Scale;
import org.junit.jupiter.api.Test;

/**
 * Estimated one-rep max (K-218, H3 B15): Epley on the reps the set was from failure — reps + RIR — to 0.1 kg; nothing
 * where the estimate is not trustworthy: no RIR (distance from failure unknown), more than ten reps to failure (Mayhew
 * 2008), no rep or no load.
 */
class E1rmTests {

    private static final Parameters P = parameters(Sex.MALE);
    private static final int MAX = P.wholeNumber(ParameterKey.E1RM_MAX_REPS_TO_FAILURE);

    @Test
    void epleyOnRepsPlusRepsInReserve() {
        // 100 kg × 5 at RIR 1 → 6 reps to failure → 100 × (1 + 6/30) = 120.0
        assertThat(E1rm.estimate(new BigDecimal("100"), 5, 1, P)).contains(new BigDecimal("120.0"));
        // 80 kg × 8 at RIR 2 → 10 → 80 × 1.333… = 106.7
        assertThat(E1rm.estimate(new BigDecimal("80"), 8, 2, P)).contains(new BigDecimal("106.7"));
    }

    @Test
    void oneRepToFailureIsTheLoadItself() {
        // By definition; Epley would add 3 %.
        assertThat(E1rm.estimate(new BigDecimal("140"), 1, 0, P)).contains(new BigDecimal("140.0"));
    }

    @Test
    void noEstimateBeyondTenRepsToFailure() {
        assertThat(E1rm.estimate(new BigDecimal("100"), 8, 2, P)).isPresent();
        assertThat(E1rm.estimate(new BigDecimal("100"), 9, 2, P)).isEmpty();
        assertThat(E1rm.estimate(new BigDecimal("60"), 15, 0, P)).isEmpty();
    }

    @Test
    void noEstimateWithoutRepsInReserveARepOrALoad() {
        // 8 reps at RIR 0 and at RIR 5 are different sets; without RIR we cannot tell which.
        assertThat(E1rm.estimate(new BigDecimal("100"), 8, null, P)).isEmpty();
        assertThat(E1rm.estimate(new BigDecimal("100"), 0, 0, P)).isEmpty();
        assertThat(E1rm.estimate(BigDecimal.ZERO, 5, 1, P)).isEmpty();
    }

    @Test
    void anAbsurdCountIsNoEstimateNotAnOverflow() {
        // reps + RIR in int arithmetic would wrap to a negative number and a negative e1RM (K-218 review).
        assertThat(E1rm.estimate(new BigDecimal("100"), 5, Integer.MAX_VALUE, P)).isEmpty();
        assertThat(E1rm.estimate(new BigDecimal("100"), Integer.MAX_VALUE, 0, P)).isEmpty();
    }

    @Test
    void roundsHalfUpLikeTheRestOfTheEngine() {
        // 91.5 × (1 + 3/30) = 100.65 → 100.7
        assertThat(E1rm.estimate(new BigDecimal("91.5"), 2, 1, P)).contains(new BigDecimal("100.7"));
    }

    @Test
    void roundsOnceSoAnExactHalfGoesUp() {
        // The exact value of a tie, rounded once: 52.5 × 37/30 = 64.75, not 64.7499… cut to 16 digits first. The same
        // vectors are the phone's (workout-summary.test.ts): the summary and the engine say one estimated max (K-406).
        assertThat(E1rm.estimate(new BigDecimal("52.5"), 5, 2, P)).contains(new BigDecimal("64.8"));
        assertThat(E1rm.estimate(new BigDecimal("82.5"), 5, 2, P)).contains(new BigDecimal("101.8"));
        assertThat(E1rm.estimate(new BigDecimal("30.75"), 6, 2, P)).contains(new BigDecimal("39.0"));
        assertThat(E1rm.estimate(new BigDecimal("15.75"), 3, 1, P)).contains(new BigDecimal("17.9"));
        assertThat(E1rm.estimate(new BigDecimal("2.25"), 7, 1, P)).contains(new BigDecimal("2.9"));
    }

    @Property
    void neverUnderTheLoadAndNeverDownWithMoreReps(@ForAll @BigRange(min = "1", max = "500") @Scale(2) BigDecimal load,
            @ForAll @IntRange(min = 1, max = 10) int reps, @ForAll @IntRange(min = 0, max = 9) int rir) {
        if (reps + rir >= MAX) {
            return;
        }
        assertThat(E1rm.estimate(load, reps, rir, P)).isPresent();
        assertThat(E1rm.estimate(load, reps + 1, rir, P)).isPresent();
        BigDecimal estimate = E1rm.estimate(load, reps, rir, P).orElseThrow();
        BigDecimal oneMore = E1rm.estimate(load, reps + 1, rir, P).orElseThrow();

        assertThat(estimate).isGreaterThanOrEqualTo(load.setScale(1, java.math.RoundingMode.HALF_UP));
        assertThat(oneMore).isGreaterThanOrEqualTo(estimate);
    }

    @Test
    void theRepsASetIsWorthAtAnotherLoadAtTheSameDistanceFromFailure() {
        // K-430 (ADR-041 #55): Epley both ways — 35 kg × 16 at RIR 1 is 17 to failure, 35 × 47/30 = 54.8; at 42 that is
        // 30 × (35 × 47 / 42) / 30 − 30 = 9.2 to failure, rounded down to 9, so 8 reps at the same RIR 1.
        assertThat(E1rm.repsAt(new BigDecimal("35"), 16, 1, new BigDecimal("42"), P)).isEqualTo(8);
        // One rep fewer: 35 × 46 / 42 = 38.3 → 8 to failure → 7 reps.
        assertThat(E1rm.repsAt(new BigDecimal("35"), 15, 1, new BigDecimal("42"), P)).isEqualTo(7);
        // The K-414 machine: 35 × 12 at RIR 1 is worth 4 reps at 42.
        assertThat(E1rm.repsAt(new BigDecimal("35"), 12, 1, new BigDecimal("42"), P)).isEqualTo(4);
    }

    @Test
    void aLoadBeyondWhatTheSetIsWorthIsNoRepNotANegativeOne() {
        // 10 kg × 12 at RIR 1 at 20 kg: 10 × 43 / 20 = 21.5 → under the divisor; nothing to do there, 0.
        assertThat(E1rm.repsAt(new BigDecimal("10"), 12, 1, new BigDecimal("20"), P)).isZero();
    }

    @Property
    void atTheSameLoadASetIsWorthItsOwnRepsAndAHeavierLoadNeverMore(@ForAll @BigRange(min = "1", max = "300") @Scale(2) BigDecimal load,
            @ForAll @IntRange(min = 1, max = 40) int reps, @ForAll @IntRange(min = 0, max = 5) int rir,
            @ForAll @BigRange(min = "0", max = "100") @Scale(2) BigDecimal more) {
        assertThat(E1rm.repsAt(load, reps, rir, load, P)).isEqualTo(reps);
        int heavier = E1rm.repsAt(load, reps, rir, load.add(more), P);
        assertThat(heavier).isBetween(0, reps);
        assertThat(E1rm.repsAt(load, reps + 1, rir, load.add(more), P)).isGreaterThanOrEqualTo(heavier);
    }
}
