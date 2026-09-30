package app.keel.training;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * The deload ladder's calls on the program (K-217, K-110, G7 K-68): hold the load (first rung, until the next rung), a
 * lighter week (the sets × deload_volume_factor, rounded down but never under one: the week is for recovering), a week
 * off. Each is a change with its first and last day; the lighter and rest weeks last until the call's next review and
 * end on their own. A call applied twice is one change (keyed by the call); undone, it is gone.
 */
final class TrainingChanges {

    enum Kind { HOLD_LOAD, LIGHTER_WEEK, REST_WEEK }

    /** {@code endsOn} null: until the next rung; {@code setsFactor} only for a lighter week. */
    record Change(UUID callId, Kind kind, LocalDate startsOn, LocalDate endsOn, BigDecimal setsFactor) {
    }

    private TrainingChanges() {
    }

    /** The change of this kind in force today, the latest if several overlap. */
    static Optional<Change> inForce(List<Change> changes, Kind kind, LocalDate today) {
        return changes.stream().filter(change -> change.kind() == kind && !today.isBefore(change.startsOn())
                        && (change.endsOn() == null || !today.isAfter(change.endsOn())))
                .max(Comparator.comparing(Change::startsOn));
    }

    /** This week's sets of a planned exercise. */
    static int sets(int baseSets, Optional<Change> lighter) {
        return lighter.map(change -> Math.max(1, BigDecimal.valueOf(baseSets).multiply(change.setsFactor()).setScale(0, RoundingMode.FLOOR)
                .intValueExact())).orElse(baseSets);
    }

    /**
     * The last day of a hold the next rung ends: the day before the rung starts — or, for a hold begun that day or later
     * (a time zone moved west), the day before the hold began, so it is never in force.
     */
    static LocalDate holdClosedOn(Change hold, LocalDate nextRungStarts) {
        LocalDate dayBefore = nextRungStarts.minusDays(1);
        return hold.startsOn().isAfter(dayBefore) ? hold.startsOn().minusDays(1) : dayBefore;
    }
}
