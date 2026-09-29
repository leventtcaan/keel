package app.keel.engine;

import java.util.Objects;
import java.util.regex.Pattern;

/**
 * A key into data/copy/en.json (K2, ADR-010), e.g. {@code decision.adjust_calories}. The engine returns keys and
 * the app looks up the words, so no user-facing text lives in code. Whether the key exists in en.json is checked
 * where the file is available (K-112), not here: the engine does no I/O.
 */
public record CopyKey(String value) {

    // Dotted lowercase path with at least two segments, like the nesting in en.json.
    private static final Pattern DOTTED_LOWERCASE = Pattern.compile("[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)+");

    public CopyKey {
        Objects.requireNonNull(value, "value");
        if (!DOTTED_LOWERCASE.matcher(value).matches()) {
            throw new IllegalArgumentException("CopyKey must be a dotted lowercase key like 'decision.continue': '" + value + "'");
        }
    }
}
