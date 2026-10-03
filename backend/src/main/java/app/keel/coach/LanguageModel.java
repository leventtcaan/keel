package app.keel.coach;

/**
 * The port to a language model (K-503, ADR-004, ADR-042): the coach's words — an explanation, a reply to an objection,
 * free text read into a record — never a decision (U1). Which model answers is configuration (keel.coach.provider); an
 * adapter never reaches the network itself, only the privacy module does (EgressRuleTests). Called through
 * {@link CoachModel} only, which puts every call through the privacy gate (LanguageModelBoundaryTests).
 */
interface LanguageModel {

    ModelReply complete(ModelRequest request);
}
