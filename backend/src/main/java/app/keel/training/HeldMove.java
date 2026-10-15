package app.keel.training;

import java.math.BigDecimal;

/**
 * The move whose target a hold of the load changes (K-1009, ADR-077 Ek 4), for decision to say on the call screen: the
 * target the program stores ({@code before}) and the one it shows while the load is held ({@code after}). The unit is the
 * program's: kilograms and reps.
 */
public record HeldMove(String exerciseId, Target before, Target after) {

    /** One target: the load in kilograms and the reps, as a planned exercise holds them. */
    public record Target(BigDecimal loadKg, int reps) {
    }
}
