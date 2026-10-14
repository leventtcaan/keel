package app.keel.training;

import app.keel.engine.RepRange;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Which move's target a hold of the load changes, for the call screen (K-1009, ADR-077 Ek 4). The program stores each
 * move's next target; while the deload ladder holds the load, one above the last load (an added load, or a rep past the
 * top of the range that stood in for one) is shown as the last load at the top of the range ({@link NextTargets#shown},
 * K-217). That is the change, read from the program's own rule: no second rule, no new threshold.
 *
 * <p>Of the moves it changes the call is about the most stalled (sessions with neither more load nor more reps, H3 B5; the
 * progress screen's "stuck", K-965, counts them the same), and on a tie the first in the program: one move, the same
 * whatever the order the rows are read in.
 */
final class HeldTargets {

    /**
     * One planned exercise as the program holds it. {@code stored} and {@code lastLoadKg} null: no target yet (nothing is
     * shown, nothing to hold). {@code steppedBack}: back after a long break the target shown is a step lighter (K-531),
     * which comes before the hold, so the hold changes nothing.
     */
    record Move(String exerciseId, NextTargets.Target stored, BigDecimal lastLoadKg, RepRange range, int stalledSessions, boolean steppedBack) {
    }

    private HeldTargets() {
    }

    /** The most stalled move whose target the hold changes, in program order on a tie; none when it changes none. */
    static Optional<HeldMove> mostStuck(List<Move> moves) {
        Move chosen = null;
        HeldMove change = null;
        for (Move move : moves) {
            Optional<HeldMove> held = change(move);
            if (held.isPresent() && (chosen == null || move.stalledSessions() > chosen.stalledSessions())) {
                chosen = move;
                change = held.get();
            }
        }
        return Optional.ofNullable(change);
    }

    private static Optional<HeldMove> change(Move move) {
        if (move.steppedBack() || move.stored() == null || move.lastLoadKg() == null) {
            return Optional.empty();
        }
        NextTargets.Target shown = NextTargets.shown(move.stored(), move.lastLoadKg(), move.range(), true);
        if (shown.loadKg().compareTo(move.stored().loadKg()) == 0 && shown.reps() == move.stored().reps()) {
            return Optional.empty();
        }
        return Optional.of(new HeldMove(move.exerciseId(), new HeldMove.Target(move.stored().loadKg(), move.stored().reps()),
                new HeldMove.Target(shown.loadKg(), shown.reps())));
    }
}
