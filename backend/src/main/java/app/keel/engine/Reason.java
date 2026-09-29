package app.keel.engine;

import java.util.Objects;

/** Why the engine decided: which rule fired and which research it rests on (U3, U14). */
public record Reason(RuleId rule, Source source) {

    public Reason {
        Objects.requireNonNull(rule, "rule");
        Objects.requireNonNull(source, "source");
    }
}
