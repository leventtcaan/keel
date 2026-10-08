package app.keel.training;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Records (ADR-075 #7 and Ek 2; ADR-078 #2): a presentation of the set log, not a rule
 * (plan/yeni-yuz-kurallar.md › Kural olmayan sunumlar). An earlier set <b>dominates</b> a set when it was at least as heavy
 * with at least as many reps. A <b>record</b> is a working set no earlier working set of its move dominates: the first
 * time at a load (whatever the reps), or more reps than ever at a load at least that heavy — double progression's two
 * steps (K-109, H3 B4). A tie is dominated, so it is none; an old light set of many reps never blocks a heavier one. No
 * estimated max (B10, U5).
 * <p>
 * Only working sets are compared (the log's real sets; a warm-up, a drop or a set to failure is not one, as for effort,
 * SetType), the earlier sets of the same session included. A set on another move (a swap) is that move's history. Sides
 * are one history: a move's best is its best side's. The move's first session is its <b>baseline</b>: its best set
 * (SessionTable.best). Sets in the order done, oldest first; a set of no reps is no set done.
 */
final class PersonalRecords {

    enum Kind { BASELINE, RECORD }

    record Mark(Kind kind, TrainingLog.WorkSet set) {
    }

    private PersonalRecords() {
    }

    static boolean dominates(TrainingLog.WorkSet earlier, TrainingLog.WorkSet set) {
        return earlier.loadKg().compareTo(set.loadKg()) >= 0 && earlier.reps() >= set.reps();
    }

    /**
     * What a session's sets of a move are against its earlier ones: the baseline when there are none, else its record —
     * the best (SessionTable.best) of its sets no earlier set dominates; empty when every set was dominated.
     */
    static Optional<Mark> of(List<TrainingLog.WorkSet> earlier, List<TrainingLog.WorkSet> session) {
        List<TrainingLog.WorkSet> before = done(earlier);
        if (before.isEmpty()) {
            return SessionTable.best(session).map(set -> new Mark(Kind.BASELINE, set));
        }
        List<TrainingLog.WorkSet> records = new ArrayList<>();
        for (TrainingLog.WorkSet set : done(session)) {
            if (before.stream().noneMatch(other -> dominates(other, set))) {
                records.add(set);
            }
            before.add(set);
        }
        return SessionTable.best(records).map(set -> new Mark(Kind.RECORD, set));
    }

    /** The move's best set over its whole history: its last record, or its baseline before the first one. */
    static Optional<Mark> best(List<TrainingLog.WorkSet> history) {
        Map<Instant, List<TrainingLog.WorkSet>> sessions = done(history).stream()
                .collect(Collectors.groupingBy(TrainingLog.WorkSet::at, LinkedHashMap::new, Collectors.toList()));
        Optional<Mark> best = Optional.empty();
        List<TrainingLog.WorkSet> earlier = new ArrayList<>();
        for (List<TrainingLog.WorkSet> session : sessions.values()) {
            Optional<Mark> mark = of(earlier, session);
            if (mark.isPresent()) {
                best = mark;
            }
            earlier.addAll(session);
        }
        return best;
    }

    private static List<TrainingLog.WorkSet> done(List<TrainingLog.WorkSet> sets) {
        return new ArrayList<>(sets.stream().filter(set -> set.reps() >= 1).toList());
    }
}
