package app.keel.engine;

import java.util.List;
import java.util.Objects;

/**
 * What the weekly spine concluded (K-106): either a finished decision, or that calories should move one way — the
 * spine knows the direction from the coaching tree, the calorie ladder (K-107) knows the amount, and the assembly (K-112)
 * puts them together.
 */
public sealed interface SpineResult {

    record Decided(Decision decision) implements SpineResult {

        public Decided {
            Objects.requireNonNull(decision, "decision");
        }
    }

    /** Calories should move {@code direction}; {@code reasons} say why (the first one decided). */
    record CaloriesNeeded(CalorieDirection direction, List<Reason> reasons) implements SpineResult {

        public CaloriesNeeded {
            Objects.requireNonNull(direction, "direction");
            reasons = List.copyOf(reasons);
            if (reasons.isEmpty()) {
                throw new IllegalArgumentException("A calorie change needs a reason (U3)");
            }
        }
    }
}
