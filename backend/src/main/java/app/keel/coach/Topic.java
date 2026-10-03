package app.keel.coach;

/**
 * What a message to the coach is about (K-529, ADR-043 #76): the closed list the model classifies into. Each has its
 * sentence in the app's copy (coach.topic.&lt;topic&gt;: no number, no blame, no concession — U1, U2, U7). A topic about the
 * call is answered with one of the call's rules and that the call stands; one that is not names no rule.
 */
enum Topic {
    /** Wants less of what the call asks: a smaller step, none, a softer version. */
    LESS(true),
    /** Wants more or faster: a bigger step, more training, a call now. */
    MORE(true),
    /** Wants it later: after an event, a trip, next month. */
    LATER(true),
    HUNGER(true),
    /** Doubts the data the call read: the scale, the sleep, the log. */
    DOUBTS_DATA(true),
    /** Feels fine, so sees no need for a lighter call. */
    FEELS_FINE(true),
    /** Fears what the call costs: gains, fat. */
    WORRY(true),
    /** Angry, or feels blamed. */
    FRUSTRATED(true),
    /** A doctor's advice or a health matter: the coach is not care (U6). */
    HEALTH(false),
    /** A question about the call. */
    WHY(true),
    /** Not about the call or the plan. */
    OFF_TOPIC(false);

    private final boolean aboutTheCall;

    Topic(boolean aboutTheCall) {
        this.aboutTheCall = aboutTheCall;
    }

    boolean aboutTheCall() {
        return aboutTheCall;
    }
}
