package app.keel.engine;

/**
 * What life brought, as the user declared it for the week (K-516, ADR-038, L3 §4.2). Sickness and pain are health data
 * (GDPR Art. 9): an engine input only, never printed. Which of them are health data: {@link #isHealthData()}.
 */
public enum DeclaredContext {
    TRAVELING,
    SICK,
    PAIN,
    BUSY,
    NEW_GYM;

    /**
     * Whether the state is health data (K-1021, ADR-077 Ek 6): sickness and pain are, so they wait for the HEALTH_DATA consent
     * and go with it; traveling, a busy week and a new gym are calendar facts, kept without it. Spelled out per state, so a
     * state added later fails to compile here until someone decides which it is.
     */
    public boolean isHealthData() {
        return switch (this) {
            case SICK, PAIN -> true;
            case TRAVELING, BUSY, NEW_GYM -> false;
        };
    }
}
