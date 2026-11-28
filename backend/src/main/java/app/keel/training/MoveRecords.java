package app.keel.training;

import app.keel.engine.E1rm;
import app.keel.engine.Parameters;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.TreeMap;
import java.util.function.BiPredicate;
import java.util.stream.Stream;

/**
 * A move's records of all time from its working sets (K-1259, ADR-096, ADR-033 §3), as the phone wrote them before
 * (train/history.ts): a compound move with an external load its heaviest, its highest estimated max and its most reps at each
 * load; an isolation move only its most reps at each load (G6 K-33: no weight tracking); a bodyweight move its most reps; a
 * weighted one its heaviest added and its most reps with the body alone. A tie keeps the first time it was done. Loads compare
 * as numbers in kg (the phone joins two that read the same in its unit). No volume record (B §6.4).
 */
final class MoveRecords {

    enum Kind { HEAVIEST, ESTIMATED_MAX, REPS_AT, MOST_REPS }

    /** A working set and when its session began. */
    record Done(BigDecimal loadKg, int reps, Integer rir, Instant on) {
    }

    /** Contract MoveRecord: a load and reps, or the estimated max in {@code kg}, or reps alone. */
    record Record(Kind kind, BigDecimal loadKg, Integer reps, BigDecimal kg, Instant on) {
    }

    private MoveRecords() {
    }

    /** {@code worked}: the move's working sets, oldest first, so the first set to reach a value holds its record. */
    static List<Record> of(ExerciseCatalog.Kind kind, ExerciseCatalog.Load load, List<Done> worked, Parameters parameters) {
        return switch (load) {
            case BODYWEIGHT -> mostReps(worked);
            case BODYWEIGHT_PLUS_EXTERNAL -> Stream.concat(heaviest(worked.stream().filter(d -> d.loadKg().signum() > 0).toList()).stream(),
                    mostReps(worked.stream().filter(d -> d.loadKg().signum() == 0).toList()).stream()).toList();
            case EXTERNAL -> kind == ExerciseCatalog.Kind.ISOLATION ? repsAt(worked)
                    : Stream.of(heaviest(worked), estimatedMax(worked, parameters), repsAt(worked)).flatMap(List::stream).toList();
        };
    }

    /** The best by {@code better}; a tie keeps the first. */
    private static Optional<Done> first(List<Done> done, BiPredicate<Done, Done> better) {
        Done found = null;
        for (Done d : done) {
            if (found == null || better.test(d, found)) {
                found = d;
            }
        }
        return Optional.ofNullable(found);
    }

    private static List<Record> heaviest(List<Done> done) {
        return first(done, (a, b) -> {
            int load = a.loadKg().compareTo(b.loadKg());
            return load > 0 || load == 0 && a.reps() > b.reps();
        }).map(top -> List.of(new Record(Kind.HEAVIEST, top.loadKg(), top.reps(), null, top.on()))).orElse(List.of());
    }

    private static List<Record> mostReps(List<Done> done) {
        return first(done, (a, b) -> a.reps() > b.reps()).map(top -> List.of(new Record(Kind.MOST_REPS, null, top.reps(), null, top.on())))
                .orElse(List.of());
    }

    /** The most reps at each load, heaviest load first; 20 and 20.0 kg are one load. */
    private static List<Record> repsAt(List<Done> done) {
        TreeMap<BigDecimal, List<Done>> byLoad = new TreeMap<>(Comparator.reverseOrder());
        for (Done d : done) {
            byLoad.computeIfAbsent(d.loadKg(), load -> new ArrayList<>()).add(d);
        }
        return byLoad.values().stream().flatMap(at -> first(at, (a, b) -> a.reps() > b.reps()).stream())
                .map(top -> new Record(Kind.REPS_AT, top.loadKg(), top.reps(), null, top.on())).toList();
    }

    /** The engine's Epley (K-218) from a set with its RIR; none when no set gives one. */
    private static List<Record> estimatedMax(List<Done> done, Parameters parameters) {
        Record top = null;
        for (Done d : done) {
            Optional<BigDecimal> kg = E1rm.estimate(d.loadKg(), d.reps(), d.rir(), parameters);
            if (kg.isPresent() && (top == null || kg.get().compareTo(top.kg()) > 0)) {
                top = new Record(Kind.ESTIMATED_MAX, null, null, kg.get(), d.on());
            }
        }
        return top == null ? List.of() : List.of(top);
    }
}
