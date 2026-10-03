package app.keel.coach;

import java.util.Objects;

/**
 * What the model answered — raw text, to be read against a schema before anything uses it (ADR-004) — and the tokens it
 * cost.
 */
record ModelReply(String text, int inputTokens, int outputTokens) {

    ModelReply {
        Objects.requireNonNull(text, "text");
        if (inputTokens < 0 || outputTokens < 0) {
            throw new IllegalArgumentException("tokens are counted from 0");
        }
    }
}
