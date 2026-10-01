package app.keel.consent;

/** The three consents (ADR-007): health data processing (GDPR Art. 9), reading Apple Health, a third-party AI. */
public enum ConsentKind {
    HEALTH_DATA,
    APPLE_HEALTH,
    THIRD_PARTY_AI;

    /**
     * Whether stored data rests on this consent, so withdrawing it deletes that data (K-231, ADR-028 #21). Only health
     * data: what is read from Apple Health is kept as health data, and nothing sent to an AI is kept. A module that keeps
     * data under another consent turns that consent's answer here and deletes on {@link ConsentWithdrawn}.
     */
    public boolean coversStoredData() {
        return this == HEALTH_DATA;
    }
}
