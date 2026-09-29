package app.keel.consent;

/** The three consents (ADR-007): health data processing (GDPR Art. 9), reading Apple Health, a third-party AI. */
public enum ConsentKind {
    HEALTH_DATA,
    APPLE_HEALTH,
    THIRD_PARTY_AI
}
