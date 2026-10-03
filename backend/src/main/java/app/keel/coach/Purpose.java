package app.keel.coach;

/**
 * What a call to the model is for (K-505): the counts are kept by it, and it decides which of the data the AI consent
 * names the call carries (keel.coach.data-types, V2) — a call for something the user did not agree to send never runs.
 */
enum Purpose {
    /** A question about a call or the plan: the call's facts and the user's words (K-505). */
    EXPLAIN,
    /** Free text read into a meal record (K-504). */
    PARSE_MEAL,
    /** A meal photo read into foods and grams by eye (K-514). */
    PHOTO_MEAL
}
