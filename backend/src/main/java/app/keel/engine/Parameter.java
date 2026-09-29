package app.keel.engine;

import java.util.Objects;

/**
 * One loaded parameter: its value for each sex (the same value twice when the file gives a single {@code value}) and
 * the research it comes from (U14).
 */
public record Parameter(ParameterKey key, ParameterValue male, ParameterValue female, Source source) {

    public Parameter {
        Objects.requireNonNull(key, "key");
        Objects.requireNonNull(male, "male");
        Objects.requireNonNull(female, "female");
        Objects.requireNonNull(source, "source");
        if (male.getClass() != female.getClass()) {
            throw new IllegalArgumentException(key.yamlKey() + ": male and female values must be the same kind");
        }
    }

    public ParameterValue valueFor(Sex sex) {
        return switch (sex) {
            case MALE -> male;
            case FEMALE -> female;
        };
    }
}
