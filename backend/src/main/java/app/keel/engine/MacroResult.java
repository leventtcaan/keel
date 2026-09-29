package app.keel.engine;

import java.util.List;
import java.util.Objects;

/** A macro split for the target, or the honest answer that the target is too low for any split the rules allow. */
public sealed interface MacroResult {

    record Split(Macros macros) implements MacroResult {

        public Split {
            Objects.requireNonNull(macros, "macros");
        }
    }

    /**
     * No split keeps protein, the fat floor and the carb floor at this target. {@code minimumKcal} is the smallest
     * target that does; the weekly decision raises calories or moves more instead of cutting this far (H3 Ç3).
     */
    record TargetTooLow(int minimumKcal, List<Reason> reasons) implements MacroResult {

        public TargetTooLow {
            Objects.requireNonNull(reasons, "reasons");
            reasons = List.copyOf(reasons);
        }
    }
}
