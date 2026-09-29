package app.keel.training;

import java.math.BigDecimal;

/**
 * What a set can be for its move (K-218, L3 P6): the load model and the sides come from the catalog, the set type
 * fixes what RIR may be. A set that breaks these would feed the engine a wrong load or a wrong effort.
 */
final class SetRules {

    private SetRules() {
    }

    static boolean accepts(ExerciseCatalog.Exercise move, SetType type, BigDecimal loadKg, Integer rir, Side side) {
        // One side at a time: each side is its own set, so progress is followed per side.
        boolean sides = move.unilateral() ? side == Side.LEFT || side == Side.RIGHT : side == null || side == Side.BOTH;
        // Bodyweight only: the bodyweight comes from the scale; an added load belongs to a BODYWEIGHT_PLUS_EXTERNAL move.
        boolean load = move.load() != ExerciseCatalog.Load.BODYWEIGHT || loadKg.signum() == 0;
        // To failure means no rep left.
        boolean effort = type != SetType.FAILURE || rir == null || rir == 0;
        return sides && load && effort;
    }
}
