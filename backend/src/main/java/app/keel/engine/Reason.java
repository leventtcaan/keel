package app.keel.engine;

import java.util.Objects;

/**
 * Why the engine decided: which rule fired and which research it rests on. This is the "which rule" half of U3;
 * the "which data" half (the observed values the rule compared) is added when the first data-driven rule lands
 * (K-103).
 *
 * <p>U14: an engine rule rests on Güray's experience or the literature. A product decision may set a parameter
 * (e.g. a quota) but is never the reason for a coaching decision.
 */
public record Reason(RuleId rule, Source source) {

    public Reason {
        Objects.requireNonNull(rule, "rule");
        Objects.requireNonNull(source, "source");
        if (source.tag() == SourceTag.PRODUCT) {
            throw new IllegalArgumentException(
                    "Rule '" + rule.value() + "' needs experience or literature behind it, not a product decision (U14)");
        }
    }
}
