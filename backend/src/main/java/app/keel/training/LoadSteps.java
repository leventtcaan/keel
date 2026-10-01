package app.keel.training;

import app.keel.shared.Decimals;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * The loads a gym can make (K-414, L3 Y7, ADR-032): the engine's added load rounded to the nearest one the gym has, and
 * the plates per side for a total. The same cases are run by the app's implementation (contracts/fixtures/load-steps.json).
 *
 * <p>Counted in whole hundredths of a kg (ADR-029: loads are stored to 2 decimals), so no sum drifts. Plates are assumed
 * in enough pairs; the plates that make an amount are found by dynamic programming, which — unlike taking the heaviest
 * plate first — also finds 20 as 10 + 10 when the set is 15 and 10.
 */
final class LoadSteps {

    /** What the gym makes of the engine's load: a load, nothing heavier than the last, or no word on this equipment. */
    sealed interface Rounding {
        record To(BigDecimal kg) implements Rounding {
        }

        record NoHeavier() implements Rounding {
        }

        record Unknown() implements Rounding {
        }
    }

    /**
     * A load the gym can make, in hundredths; the pieces it is made of (plates on the load, or one dumbbell); and how
     * many of them may be off by half a hundredth (none when every weight is an exact kg value).
     */
    private record Candidate(long load, int pieces, int fuzz) {
    }

    /** Every kg plate and dumbbell is a multiple of 0.05 kg; a weight that is not was entered in lb and rounded. */
    private static final long EXACT_KG = 5;

    private static final int UNREACHABLE = Integer.MAX_VALUE;

    private LoadSteps() {
    }

    /**
     * The nearest load the gym makes to {@code targetKg} that is heavier than {@code lastKg}; a tie goes to the lighter.
     * A plate entered in lb is stored to the nearest hundredth of a kg, so one real load can be stored as several loads
     * a few hundredths apart — 230 lb as 45 + 45 + 2.5 a side, or as nine 10s and a 2.5 (K-414 review). Each such piece
     * is off by at most half a hundredth, so loads closer than half their pieces together can be one load: among those,
     * the one with the fewest pieces is the one meant. Weights in kg are exact (multiples of 0.05 kg): for them the rule
     * never comes into play, and nearest alone decides.
     */
    static Rounding round(ExerciseCatalog.Equipment equipment, String exerciseId, GymStore.Gym gym, BigDecimal lastKg, BigDecimal targetKg) {
        long last = hundredths(lastKg);
        long target = hundredths(targetKg);
        List<Candidate> candidates = switch (equipment) {
            case DUMBBELL -> gym.dumbbellsKg().stream().map(kg -> new Candidate(hundredths(kg), 1, 0)).toList();
            case MACHINE, CABLE -> stack(Optional.ofNullable(gym.machineStepsKg().get(exerciseId)).orElse(gym.stackStepKg()), target);
            case BARBELL -> gym.barKg() == null ? List.of() : plates(hundredths(gym.barKg()), 2, gym.platesKg(), target);
            case PLATE_LOADED -> plates(0, 2, gym.platesKg(), target);
            case BODYWEIGHT -> {
                List<Candidate> added = new ArrayList<>(plates(0, 1, gym.platesKg(), target));
                gym.dumbbellsKg().forEach(kg -> added.add(new Candidate(hundredths(kg), 1, exact(kg) ? 0 : 1)));
                yield added;
            }
        };
        if (candidates.isEmpty()) {
            return new Rounding.Unknown();
        }
        List<Candidate> heavier = candidates.stream().filter(candidate -> candidate.load() > last).toList();
        Comparator<Candidate> nearest = Comparator.comparingLong((Candidate candidate) -> Math.abs(candidate.load() - target))
                .thenComparingLong(Candidate::load);
        return heavier.stream().min(nearest)
                .flatMap(best -> heavier.stream().filter(candidate -> sameLoad(candidate, best))
                        .min(Comparator.comparingInt(Candidate::pieces).thenComparing(nearest)))
                .<Rounding>map(candidate -> new Rounding.To(kg(candidate.load()))).orElse(new Rounding.NoHeavier());
    }

    /** Whether two stored loads can be one real load: apart by no more than half a hundredth for each inexact piece. */
    private static boolean sameLoad(Candidate a, Candidate b) {
        return 2 * Math.abs(a.load() - b.load()) <= a.fuzz() + b.fuzz();
    }

    private static boolean exact(BigDecimal kg) {
        return hundredths(kg) % EXACT_KG == 0;
    }

    /**
     * The plates on each side that make {@code totalKg} over {@code baseKg} (the bar; 0 for a sled): the fewest, heavier
     * first on a tie, heaviest first in the list. Empty when no pair of plates makes it.
     */
    static Optional<List<BigDecimal>> platesPerSide(BigDecimal totalKg, BigDecimal baseKg, List<BigDecimal> platesKg) {
        long both = hundredths(totalKg) - hundredths(baseKg);
        if (both < 0 || both % 2 != 0) {
            return Optional.empty();
        }
        int side = Math.toIntExact(both / 2);
        long[] plates = platesKg.stream().mapToLong(LoadSteps::hundredths).sorted().toArray();
        int[] fewest = fewest(plates, side);
        if (fewest[side] == UNREACHABLE) {
            return Optional.empty();
        }
        List<BigDecimal> found = new ArrayList<>();
        // The heaviest plate that still leaves the fewest, each time: the heaviest-first among the fewest, in order.
        for (int left = side; left > 0;) {
            for (int i = plates.length - 1; i >= 0; i--) {
                int rest = left - (int) plates[i];
                if (rest >= 0 && fewest[rest] != UNREACHABLE && fewest[rest] == fewest[left] - 1) {
                    found.add(kg(plates[i]));
                    left = rest;
                    break;
                }
            }
        }
        return Optional.of(List.copyOf(found));
    }

    /** A stack by its step: the multiples on either side of the target (a 0 below one step is not heavier than any load). */
    private static List<Candidate> stack(BigDecimal stepKg, long target) {
        if (stepKg == null) {
            return List.of();
        }
        long step = hundredths(stepKg);
        long below = target / step * step;
        return List.of(new Candidate(below, 1, 0), new Candidate(below >= target ? below : below + step, 1, 0));
    }

    /**
     * Every load the plates make over {@code base}, {@code perLoad} of each plate (2 for a pair, 1 for a belt), up to the
     * first one past the target: plates go up by at most the lightest plate, so one exists within a plate of it.
     */
    private static List<Candidate> plates(long base, int perLoad, List<BigDecimal> platesKg, long target) {
        if (platesKg.isEmpty()) {
            return List.of();
        }
        long[] plates = platesKg.stream().mapToLong(LoadSteps::hundredths).sorted().toArray();
        long heaviest = plates[plates.length - 1];
        int ceiling = Math.toIntExact(Math.max(0, target - base) / perLoad + 1 + heaviest);
        int[] fewest = fewest(plates, ceiling);
        boolean inexact = platesKg.stream().anyMatch(kg -> !exact(kg));
        List<Candidate> loads = new ArrayList<>();
        for (int side = 0; side <= ceiling; side++) {
            if (fewest[side] != UNREACHABLE) {
                int pieces = perLoad * fewest[side];
                loads.add(new Candidate(base + (long) perLoad * side, pieces, inexact ? pieces : 0));
            }
        }
        return loads;
    }

    /** The fewest plates that make each amount up to {@code ceiling} (unbounded of each), or UNREACHABLE. */
    private static int[] fewest(long[] plates, int ceiling) {
        int[] fewest = new int[ceiling + 1];
        Arrays.fill(fewest, UNREACHABLE);
        fewest[0] = 0;
        for (int amount = 1; amount <= ceiling; amount++) {
            for (long plate : plates) {
                if (plate <= amount && fewest[amount - (int) plate] != UNREACHABLE) {
                    fewest[amount] = Math.min(fewest[amount], fewest[amount - (int) plate] + 1);
                }
            }
        }
        return fewest;
    }

    private static long hundredths(BigDecimal kg) {
        return kg.setScale(2, RoundingMode.HALF_UP).unscaledValue().longValueExact();
    }

    private static BigDecimal kg(long hundredths) {
        return Decimals.plain(BigDecimal.valueOf(hundredths, 2));
    }
}
