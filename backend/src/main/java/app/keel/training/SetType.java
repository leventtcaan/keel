package app.keel.training;

/**
 * What a set was (K-218, L3 P6). Only WORKING sets count toward effort and the estimated one-rep max: a warm-up is
 * light on purpose, a drop set is done tired at a lower load, a FAILURE set is one taken past the plan to failure
 * (its RIR is 0 by definition).
 */
public enum SetType {
    WARM_UP,
    WORKING,
    DROP,
    FAILURE
}
