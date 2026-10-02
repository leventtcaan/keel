package app.keel.engine;

/**
 * What life brought, as the user declared it for the week (K-516, ADR-038, L3 §4.2). Sickness and pain are health data
 * (GDPR Art. 9): an engine input only, never printed.
 */
public enum DeclaredContext {
    TRAVELING,
    SICK,
    PAIN,
    BUSY,
    NEW_GYM
}
