package app.keel.engine;

import java.util.Objects;
import java.util.regex.Pattern;

/**
 * Stable name of an engine rule, e.g. {@code data_insufficient}. The same names appear as {@code reason} in the
 * specification (spec/weekly-checkin.yaml), so a decision can be traced to the row that defines it.
 */
public record RuleId(String value) {

    private static final Pattern SNAKE_CASE = Pattern.compile("[a-z][a-z0-9_]*");

    public RuleId {
        Objects.requireNonNull(value, "value");
        if (!SNAKE_CASE.matcher(value).matches()) {
            throw new IllegalArgumentException("RuleId must be snake_case starting with a letter: '" + value + "'");
        }
    }
}
