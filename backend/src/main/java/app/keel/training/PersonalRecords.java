package app.keel.training;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Records (ADR-075 #7, ADR-078 #2): a presentation of the set log, not a rule (plan/yeni-yuz-kurallar.md › Kural olmayan
 * sunumlar). A set <b>beats</b> another when it is at least as heavy with at least as many reps and is not the same
 * set: double progression's two steps (K-109, H3 B4) — a rep more at the load, or the load up once the reps hold — the
 * way the deload ladder reads "went up" (TrainingStatuses, H3 B5). A heavier set with fewer reps beats nothing: telling
 * the two apart would need an estimated max, which is never shown (B10, U5).
 * <p>
 * A <b>record</b> beats every earlier working set of its move (the log's real sets; a warm-up, a drop or a set to
 * failure is not one, as for effort, SetType), the earlier sets of its own session included; a tie is none. A set on
 * another move (a swap) is that move's history. Sides are one history: a move's best is its best side's. The move's
 * first session is its <b>baseline</b>: its best set (SessionTable.best). Sets in the order done, oldest first; a set of
 * no reps is no set done.
 */
final class PersonalRecords {

    enum Kind { BASELINE, RECORD }

    record Mark(Kind kind, TrainingLog.WorkSet set) {
    }

    private PersonalRecords() {
    }

    static boolean beats(TrainingLog.WorkSet set, TrainingLog.WorkSet other) {
        int load = set.loadKg().compareTo(other.loadKg());
        return load >= 0 && set.reps() >= other.reps() && (load > 0 || set.reps() > other.reps());
    }

    /**
     * What a session's sets of a move are against its earlier ones: the baseline when there are none, else the last set
     * that beat everything before it; empty when no set did.
     */
    static Optional<Mark> of(List<TrainingLog.WorkSet> earlier, List<TrainingLog.WorkSet> session) {
        List<TrainingLog.WorkSet> before = done(earlier);
        if (before.isEmpty()) {
            return SessionTable.best(session).map(set -> new Mark(Kind.BASELINE, set));
        }
        Optional<Mark> record = Optional.empty();
        for (TrainingLog.WorkSet set : done(session)) {
            if (before.stream().allMatch(other -> beats(set, other))) {
                record = Optional.of(new Mark(Kind.RECORD, set));
            }
            before.add(set);
        }
        return record;
    }

    /** The move's best set over its whole history: its last record, or its baseline before the first one. */
    static Optional<Mark> best(List<TrainingLog.WorkSet> history) {
        Map<java.time.Instant, List<TrainingLog.WorkSet>> sessions = done(history).stream()
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
