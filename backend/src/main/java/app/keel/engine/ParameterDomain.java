package app.keel.engine;

import java.util.Locale;

/** The engine's parameter files in data/parameters/ (ADR-010). The caller reads exactly these and nothing else. */
public enum ParameterDomain {
    MEASUREMENT,
    NUTRITION,
    PROJECTION,
    SAFETY,
    TRAINING,
    WINDOWS;

    /** File name inside data/parameters/, e.g. {@code windows.yaml}. */
    public String fileName() {
        return name().toLowerCase(Locale.ROOT) + ".yaml";
    }
}
