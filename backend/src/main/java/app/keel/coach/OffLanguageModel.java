package app.keel.coach;

/**
 * The coach without a model (K-907, ADR-064 #5: the AI is off in the beta): nothing goes anywhere and nothing of a request
 * is kept. It is never called while keel.consent.third-party-ai is unset — no AI consent can be given, so CoachModel never
 * asks — and if it were, it fails as a provider that is down would; the coach then says what the engine wrote.
 */
final class OffLanguageModel implements LanguageModel {

    @Override
    public ModelReply complete(ModelRequest request) {
        throw new IllegalStateException("the coach's language model is off (keel.coach.provider: off)");
    }
}
