package app.keel.training;

import app.keel.shared.Decimals;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

/**
 * The loads a gym can make (K-414, L3 Y7, ADR-032): the engine's added load rounded to the nearest one the gym has, and
 * the plates per side for a total. The same cases are run by the app's implementation (contracts/fixtures/load-steps.json).
 *
 * <p>Counted in whole hundredths, so no sum drifts — of a kg, or of a lb when the gym's weights were entered in lb: a lb
 * plate is stored to the hundredth of a kg on its own (10 lb is 4.54), so its sums in kg drift from what the app stores
 * for the same load typed in lb, once from the total (65 lb is 29.48, two 10s on a 45 lb bar 29.49). Counted in lb, both
 * are 65 lb. Plates are assumed in enough pairs; the plates that make an amount are found by dynamic programming, which —
 * unlike taking the heaviest plate first — also finds 20 as 10 + 10 when the set is 15 and 10.
 */
final class LoadSteps {

    /**
     * What the gym makes of the engine's load: a load, a load too far over the last (K-430), nothing heavier than the last,
     * or no word on this equipment.
     */
    sealed interface Rounding {
        record To(BigDecimal kg) implements Rounding {
        }

        /** The nearest heavier load the gym makes, further over the last than the jump allows (K-430). */
        record TooFar(BigDecimal kg) implements Rounding {
        }

        record NoHeavier() implements Rounding {
        }

        record Unknown() implements Rounding {
        }
    }

    /** The pound, by definition (ADR-029: a conversion factor, not a threshold). */
    private static final BigDecimal KG_PER_LB = new BigDecimal("0.45359237");
    /** lb plates and stacks come in quarters of a pound at the finest: the grid a lb weight sits on, in hundredths. */
    private static final long LB_GRID = 25;
    /** A weight entered in kg is a multiple of 0.05 kg; one that is not was entered in lb. */
    private static final long EXACT_KG = 5;
    /** How far a stored kg value may be from its lb weight: rounded to a hundredth, alone or as a sum of rounded plates. */
    private static final BigDecimal ON_GRID = new BigDecimal("0.01");
    private static final int UNREACHABLE = Integer.MAX_VALUE;

    /**
     * The unit a gym's weights are counted in: hundredths of a kg, or hundredths of a lb. A lb load goes back to kg as the
     * app turns a typed lb load into kg (ADR-029), so the same load is the same number whichever way it was made.
     */
    private record Scale(boolean lb) {

        static final Scale KG = new Scale(false);

        /** lb when every weight sits on the lb grid and one at least is no kg weight; kg otherwise (kg weights are exact). */
        static Scale of(Stream<BigDecimal> weights) {
            List<BigDecimal> all = weights.toList();
            boolean entered = all.stream().anyMatch(kg -> hundredths(kg) % EXACT_KG != 0);
            return new Scale(entered && all.stream().allMatch(kg -> onLbGrid(kg).isPresent()));
        }

        /** A weight the gym or the app stored: a lb one goes back to the lb it was entered as. */
        long units(BigDecimal kg) {
            if (!lb) {
                return hundredths(kg);
            }
            return onLbGrid(kg).orElseGet(() -> exactLb(kg));
        }

        /**
         * The engine's target, which no one entered in lb: converted as it is. Snapped to the quarter pound, a target a
         * hundredth of a kg past the middle of two loads would land on the middle, and the tie would go to the lighter.
         */
        long target(BigDecimal kg) {
            return lb ? exactLb(kg) : hundredths(kg);
        }

        BigDecimal kg(long units) {
            return Decimals.plain(lb ? BigDecimal.valueOf(units, 2).multiply(KG_PER_LB).setScale(2, RoundingMode.HALF_UP) : BigDecimal.valueOf(units, 2));
        }
    }

    private LoadSteps() {
    }

    /**
     * The nearest load the gym makes to {@code targetKg} that is heavier than {@code lastKg}; a tie goes to the lighter.
     * NoHeavier only where the gym's weights end (a dumbbell rack); Unknown when the gym says nothing about this equipment.
     */
    static Rounding round(ExerciseCatalog.Equipment equipment, String exerciseId, GymStore.Gym gym, BigDecimal lastKg, BigDecimal targetKg) {
        return round(equipment, exerciseId, gym, lastKg, targetKg, null);
    }

    /**
     * Whether a set's load is all the load the muscles move, so one load over another reads as how much heavier (K-430
     * review): not on a plate-loaded machine (the sled is not counted, ADR-032) nor on a bodyweight move (the body is
     * not) — there +10 → +20 kg is not a doubling, and no jump limit applies.
     */
    static boolean wholeLoad(ExerciseCatalog.Equipment equipment) {
        return switch (equipment) {
            case BARBELL, DUMBBELL, MACHINE, CABLE -> true;
            case PLATE_LOADED, BODYWEIGHT -> false;
        };
    }

    /**
     * As {@link #round(ExerciseCatalog.Equipment, String, GymStore.Gym, BigDecimal, BigDecimal)}, and the nearest heavier
     * load is taken only within {@code maxJump} of the engine's steps (target − last) over the last (K-430, ADR-037 #38):
     * further — a sparse rack, 10 kg dumbbells then 20 — it is TooFar with that load, and the caller decides when the
     * sets at the last make it (ADR-041 #55). {@code maxJump} null: no limit.
     */
    static Rounding round(ExerciseCatalog.Equipment equipment, String exerciseId, GymStore.Gym gym, BigDecimal lastKg, BigDecimal targetKg,
            BigDecimal maxJump) {
        BigDecimal stepKg = Optional.ofNullable(gym.machineStepsKg().get(exerciseId)).orElse(gym.stackStepKg());
        Scale scale = switch (equipment) {
            case DUMBBELL -> Scale.of(gym.dumbbellsKg().stream());
            case MACHINE, CABLE -> stepKg == null ? Scale.KG : Scale.of(Stream.of(stepKg));
            case BARBELL -> Scale.of(Stream.concat(Stream.ofNullable(gym.barKg()), gym.platesKg().stream()));
            case PLATE_LOADED -> Scale.of(gym.platesKg().stream());
            case BODYWEIGHT -> Scale.of(Stream.concat(gym.platesKg().stream(), gym.dumbbellsKg().stream()));
        };
        long last = scale.units(lastKg);
        long target = scale.target(targetKg);
        List<Long> loads = switch (equipment) {
            case DUMBBELL -> gym.dumbbellsKg().stream().map(scale::units).toList();
            case MACHINE, CABLE -> stepKg == null ? List.of() : stack(scale.units(stepKg), target);
            case BARBELL -> gym.barKg() == null ? List.of() : plates(scale.units(gym.barKg()), 2, units(scale, gym.platesKg()), target);
            case PLATE_LOADED -> plates(0, 2, units(scale, gym.platesKg()), target);
            case BODYWEIGHT -> {
                List<Long> added = new ArrayList<>(plates(0, 1, units(scale, gym.platesKg()), target));
                gym.dumbbellsKg().forEach(kg -> added.add(scale.units(kg)));
                yield added;
            }
        };
        if (loads.isEmpty()) {
            return new Rounding.Unknown();
        }
        return loads.stream().filter(load -> load > last)
                .min(Comparator.comparingLong((Long load) -> Math.abs(load - target)).thenComparingLong(load -> load))
                .<Rounding>map(load -> maxJump == null
                        || BigDecimal.valueOf(load - last).compareTo(maxJump.multiply(BigDecimal.valueOf(target - last))) <= 0
                        ? new Rounding.To(scale.kg(load)) : new Rounding.TooFar(scale.kg(load)))
                .orElse(new Rounding.NoHeavier());
    }

    /**
     * The plates on each side that make {@code totalKg} over {@code baseKg} (the bar; 0 for a sled): the fewest, heavier
     * first on a tie, heaviest first in the list, each as the gym has it stored. Empty when no pair of plates makes it.
     */
    static Optional<List<BigDecimal>> platesPerSide(BigDecimal totalKg, BigDecimal baseKg, List<BigDecimal> platesKg) {
        Scale scale = Scale.of(Stream.concat(Stream.of(baseKg).filter(kg -> kg.signum() > 0), platesKg.stream()));
        long both = scale.units(totalKg) - scale.units(baseKg);
        if (both < 0 || both % 2 != 0) {
            return Optional.empty();
        }
        int side = Math.toIntExact(both / 2);
        List<BigDecimal> heaviestFirst = platesKg.stream().sorted(Comparator.reverseOrder()).toList();
        long[] plates = heaviestFirst.stream().mapToLong(scale::units).toArray();
        int[] fewest = fewest(plates, side);
        if (fewest[side] == UNREACHABLE) {
            return Optional.empty();
        }
        List<BigDecimal> found = new ArrayList<>();
        // The heaviest plate that still leaves the fewest, each time: the heaviest-first among the fewest, in order.
        for (int left = side; left > 0;) {
            for (int i = 0; i < plates.length; i++) {
                int rest = left - (int) plates[i];
                if (rest >= 0 && fewest[rest] != UNREACHABLE && fewest[rest] == fewest[left] - 1) {
                    found.add(Decimals.plain(heaviestFirst.get(i)));
                    left = rest;
                    break;
                }
            }
        }
        return Optional.of(List.copyOf(found));
    }

    /** A stack by its step: the multiples on either side of the target (a 0 below one step is not heavier than any load). */
    private static List<Long> stack(long step, long target) {
        long below = target / step * step;
        return List.of(below, below >= target ? below : below + step);
    }

    /**
     * Every load the plates make over {@code base}, {@code perLoad} of each plate (2 for a pair, 1 for a belt), up to the
     * first one past the target: plates go up by at most the lightest plate, so one exists within a plate of it.
     */
    private static List<Long> plates(long base, int perLoad, long[] plates, long target) {
        if (plates.length == 0) {
            return List.of();
        }
        long heaviest = Arrays.stream(plates).max().orElseThrow();
        int ceiling = Math.toIntExact(Math.max(0, target - base) / perLoad + 1 + heaviest);
        int[] fewest = fewest(plates, ceiling);
        List<Long> loads = new ArrayList<>();
        for (int side = 0; side <= ceiling; side++) {
            if (fewest[side] != UNREACHABLE) {
                loads.add(base + (long) perLoad * side);
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

    private static long[] units(Scale scale, List<BigDecimal> weights) {
        return weights.stream().mapToLong(scale::units).toArray();
    }

    /** The lb weight a kg value stands for, in hundredths of a lb on the quarter-pound grid, if it is one. */
    private static Optional<Long> onLbGrid(BigDecimal kg) {
        long grid = kg.divide(KG_PER_LB, 4, RoundingMode.HALF_UP).movePointRight(2).divide(BigDecimal.valueOf(LB_GRID), 0, RoundingMode.HALF_UP)
                .longValueExact() * LB_GRID;
        BigDecimal exact = BigDecimal.valueOf(grid, 2).multiply(KG_PER_LB);
        return exact.subtract(kg).abs().compareTo(ON_GRID) <= 0 ? Optional.of(grid) : Optional.empty();
    }

    private static long exactLb(BigDecimal kg) {
        return kg.divide(KG_PER_LB, 2, RoundingMode.HALF_UP).unscaledValue().longValueExact();
    }

    private static long hundredths(BigDecimal kg) {
        return kg.setScale(2, RoundingMode.HALF_UP).unscaledValue().longValueExact();
    }
}
