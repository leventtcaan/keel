package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Optional;
import java.util.function.Supplier;
import org.junit.jupiter.api.Test;

/**
 * The food budget's target (K-997, ADR-072 Ek 2): the target in force; before the first call (no plan at all), the
 * starting target; with neither, none. Read lazily: the starting estimate is not worked out once a plan exists.
 */
class DayTargetsTests {

    private static final Supplier<Optional<String>> NO_STARTING = () -> {
        throw new AssertionError("not read once a plan exists");
    };

    @Test
    void theTargetInForceWins() {
        assertThat(PlanDailyTargets.choose(Optional.of("in force"), true, NO_STARTING)).contains("in force");
    }

    @Test
    void beforeTheFirstCallTheStartingTarget() {
        assertThat(PlanDailyTargets.choose(Optional.empty(), false, () -> Optional.of("starting"))).contains("starting");
        assertThat(PlanDailyTargets.choose(Optional.<String>empty(), false, Optional::empty)).isEmpty();
    }

    @Test
    void aPlanBegunWithoutATargetHasNoBudgetYet() {
        assertThat(PlanDailyTargets.choose(Optional.<String>empty(), true, NO_STARTING)).isEmpty();
    }
}
