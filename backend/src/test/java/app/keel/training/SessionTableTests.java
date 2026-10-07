package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.BodyRegion;
import app.keel.engine.LiftKind;
import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import app.keel.engine.RepRange;
import app.keel.engine.RepositoryParameters;
import app.keel.engine.Sex;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import net.jqwik.api.constraints.IntRange;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * The in-session table (K-960, ADR-075 #3): what the server works out before the gym so the phone, offline, only picks.
 * "Too heavy?" and the first-session calibration take one load step (the region's, H3 B4: 2.5 kg upper, 5 kg lower) down
 * or up from the load the session starts at, as the gym makes it (ADR-032) and never further than that step; the next
 * load once every set reaches the top of the range is the double progression's (K-109) on the same gym.
 */
class SessionTableTests {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static final RepRange SIX_TO_TEN = new RepRange(6, 10);
    private static final GymStore.Gym FULL_PLATES = gym(new BigDecimal("20"), weights("25", "20", "10", "5", "2.5", "1.25"), List.of(), null);
    private static final GymStore.Gym FIVES_ONLY = gym(new BigDecimal("20"), weights("20", "10", "5"), List.of(), null);
    private static final GymStore.Gym HALVES = gym(new BigDecimal("20"), weights("20", "10", "5", "2.5"), List.of(), null);
    private static final GymStore.Gym RACK = gym(null, List.of(), weights("10", "12", "14", "16", "20"), null);
    private static final GymStore.Gym STACK_OF_FIVE = gym(null, List.of(), List.of(), new BigDecimal("5"));

    @Test
    void theStepIsTheRegionsLoadIncrement() {
        // The table below is written in these steps (H3 B4); a changed parameter shows here first.
        assertThat(P.number(ParameterKey.LOAD_INCREMENT_UPPER_KG)).isEqualTo(2.5);
        assertThat(P.number(ParameterKey.LOAD_INCREMENT_LOWER_KG)).isEqualTo(5.0);
        assertThat(SessionTable.stepKg(BodyRegion.UPPER, P)).isEqualByComparingTo("2.5");
        assertThat(SessionTable.stepKg(BodyRegion.LOWER, P)).isEqualByComparingTo("5");
    }

    @ParameterizedTest(name = "{0}")
    @CsvSource(nullValues = "-", value = {
        "no gym: the engine step either way,                   -,        BARBELL,  UPPER, 60,   57.5, 62.5",
        "no gym (lower body),                                  -,        BARBELL,  LOWER, 100,  95,   105",
        "plates make every 2.5 kg,                              full,     BARBELL,  UPPER, 60,   57.5, 62.5",
        "pairs of 5 only: lighter is the next rung down,       fives,    BARBELL,  UPPER, 60,   50,   -",
        "pairs of 2.5: nothing heavier within 2.5,             halves,   BARBELL,  UPPER, 60,   55,   -",
        "pairs of 2.5 (lower body): a step of 5 is one pair,    halves,   BARBELL,  LOWER, 60,   55,   65",
        "a rack: the nearest within a step,                     rack,     DUMBBELL, UPPER, 12,   10,   14",
        "a rack with a gap: nothing heavier within a step,      rack,     DUMBBELL, UPPER, 16,   14,   -",
        "top of the rack: lighter is the next dumbbell down,  rack,     DUMBBELL, UPPER, 20,   16,   -",
        "bottom of the rack: nothing lighter,                    rack,     DUMBBELL, UPPER, 10,   -,    12",
        "a stack by 5: lighter one plate and nothing heavier, stack,    CABLE,    UPPER, 40,   35,   -",
        "a stack by 5 (lower body),                            stack,    MACHINE,  LOWER, 40,   35,   45",
        "a gym that says nothing of this equipment: engine step,   rack,     BARBELL,  UPPER, 60,   57.5, 62.5",
        "nothing at or under nothing,                           -,        BARBELL,  UPPER, 2.5,  -,    5"})
    void oneStepEitherWayAsTheGymMakesIt(String name, String gym, ExerciseCatalog.Equipment equipment, BodyRegion region, BigDecimal fromKg,
            BigDecimal lighter, BigDecimal heavier) {
        Optional<GymStore.Gym> inUse = Optional.ofNullable(gym).map(SessionTableTests::named);
        BigDecimal step = SessionTable.stepKg(region, P);

        assertThat(SessionTable.lighter(equipment, "move", inUse, fromKg, step).map(BigDecimal::stripTrailingZeros)).as("lighter")
                .isEqualTo(Optional.ofNullable(lighter).map(BigDecimal::stripTrailingZeros));
        assertThat(SessionTable.heavier(equipment, "move", inUse, fromKg, step).map(BigDecimal::stripTrailingZeros)).as("heavier")
                .isEqualTo(Optional.ofNullable(heavier).map(BigDecimal::stripTrailingZeros));
    }

    @Test
    void aMoveWithoutATargetCarriesTheRegionsStepForCalibrationAndOnlyThen() {
        // ADR-075 Ek 1 (G6 K-40, H3 B4): the phone adds the step to the load just logged and rounds it to the gym.
        assertThat(SessionTable.calibrationStep(Optional.empty(), BodyRegion.UPPER, P)).hasValueSatisfying(kg -> assertThat(kg).isEqualByComparingTo("2.5"));
        assertThat(SessionTable.calibrationStep(Optional.empty(), BodyRegion.LOWER, P)).hasValueSatisfying(kg -> assertThat(kg).isEqualByComparingTo("5"));
        assertThat(SessionTable.calibrationStep(Optional.of(new NextTargets.Target(new BigDecimal("60"), 8)), BodyRegion.UPPER, P))
                .as("a target: the session starts from it, no calibration").isEmpty();
    }

    @Test
    void theNextLoadOnceEverySetIsAtTheTopIsTheDoubleProgressions() {
        NextTargets.Target bench = new NextTargets.Target(new BigDecimal("60"), 8);
        NextTargets.Target squat = new NextTargets.Target(new BigDecimal("100"), 7);

        assertThat(SessionTable.nextAtTop(LiftKind.COMPOUND, BodyRegion.UPPER, SIX_TO_TEN, bench, 3, 1, false, unknown(), P))
                .hasValueSatisfying(kg -> assertThat(kg).isEqualByComparingTo("62.5"));
        assertThat(SessionTable.nextAtTop(LiftKind.COMPOUND, BodyRegion.LOWER, SIX_TO_TEN, squat, 3, 1, false, unknown(), P))
                .hasValueSatisfying(kg -> assertThat(kg).isEqualByComparingTo("105"));
        assertThat(SessionTable.nextAtTop(LiftKind.COMPOUND, BodyRegion.UPPER, SIX_TO_TEN, bench, 3, 1, false,
                load -> LoadSteps.round(ExerciseCatalog.Equipment.BARBELL, "bench_press", FIVES_ONLY, bench.loadKg(), load, null), P))
                .as("as the gym makes it: the nearest heavier, 70").hasValueSatisfying(kg -> assertThat(kg).isEqualByComparingTo("70"));
    }

    @Test
    void noNextLoadWhereNoneComesFromTheTop() {
        NextTargets.Target bench = new NextTargets.Target(new BigDecimal("60"), 8);
        NextTargets.Target curl = new NextTargets.Target(new BigDecimal("16"), 10);

        assertThat(SessionTable.nextAtTop(LiftKind.COMPOUND, BodyRegion.UPPER, SIX_TO_TEN, bench, 3, 1, true, unknown(), P)).as("the load held (K-110)")
                .isEmpty();
        assertThat(SessionTable.nextAtTop(LiftKind.ISOLATION, BodyRegion.UPPER, new RepRange(8, 12), curl, 3, 1, false, unknown(), P))
                .as("an isolation lift is not load-tracked (G6 K-33)").isEmpty();
        assertThat(SessionTable.nextAtTop(LiftKind.COMPOUND, BodyRegion.UPPER, SIX_TO_TEN, new NextTargets.Target(new BigDecimal("20"), 8), 3, 1, false,
                load -> LoadSteps.round(ExerciseCatalog.Equipment.DUMBBELL, "one_arm_dumbbell_row", RACK, new BigDecimal("20"), load, null), P))
                .as("the rack ends").isEmpty();
        assertThat(SessionTable.nextAtTop(LiftKind.COMPOUND, BodyRegion.UPPER, SIX_TO_TEN, new NextTargets.Target(BigDecimal.ZERO, 8), 3, 1, false,
                unknown(), P)).as("no load to add to").isEmpty();
    }

    @Test
    void theLastSessionsBestSetIsTheHeaviestThenTheMostRepsThenTheFewestLeft() {
        List<TrainingLog.WorkSet> sets = List.of(set("60", 9, 1), set("62.5", 6, 0), set("62.5", 7, 2), set("62.5", 7, 1), set("62.5", 7, null));

        assertThat(SessionTable.best(sets)).contains(set("62.5", 7, 1));
        assertThat(SessionTable.best(List.of(set("40", 10, null)))).as("a set logged without RIR still counts").contains(set("40", 10, null));
        assertThat(SessionTable.best(List.of())).isEmpty();
        // K-960 review: a set of no reps is no set done (the contract's reps ≥ 1): 65 × 0 does not beat 60 × 8.
        assertThat(SessionTable.best(List.of(set("60", 8, 1), set("65", 0, 0)))).contains(set("60", 8, 1));
        assertThat(SessionTable.best(List.of(set("65", 0, 0)))).isEmpty();
    }

    @Property
    void aStepFromARackIsOnItHeavierNeverPastTheStepLighterWheneverTheRackGoesLower(@ForAll("racks") List<Integer> rackTenths,
            @ForAll @IntRange(min = 10, max = 600) int fromTenths, @ForAll boolean upper) {
        List<BigDecimal> rack = rackTenths.stream().map(SessionTableTests::tenths).toList();
        BigDecimal from = tenths(fromTenths);
        BigDecimal step = SessionTable.stepKg(upper ? BodyRegion.UPPER : BodyRegion.LOWER, P);
        Optional<GymStore.Gym> gym = Optional.of(gym(null, List.of(), rack, null));

        Optional<BigDecimal> heaviest = rack.stream().filter(kg -> kg.compareTo(from) > 0 && kg.compareTo(from.add(step)) <= 0).max(BigDecimal::compareTo);
        // "Too heavy?" (ADR-075 #3): a full step down where the rack has one within it, else the next dumbbell down.
        Optional<BigDecimal> lightest = rack.stream().filter(kg -> kg.compareTo(from) < 0 && kg.compareTo(from.subtract(step)) >= 0).min(BigDecimal::compareTo)
                .or(() -> rack.stream().filter(kg -> kg.compareTo(from) < 0).max(BigDecimal::compareTo));

        assertThat(SessionTable.heavier(ExerciseCatalog.Equipment.DUMBBELL, "dumbbell_curl", gym, from, step).map(BigDecimal::stripTrailingZeros))
                .isEqualTo(heaviest.map(BigDecimal::stripTrailingZeros));
        assertThat(SessionTable.lighter(ExerciseCatalog.Equipment.DUMBBELL, "dumbbell_curl", gym, from, step).map(BigDecimal::stripTrailingZeros))
                .isEqualTo(lightest.map(BigDecimal::stripTrailingZeros));
    }

    @Property
    void aStepOnABarbellIsALoadThePlatesMakeAndNeverFurtherThanTheStep(@ForAll("plateSets") List<Integer> plateHundredths,
            @ForAll @IntRange(min = 0, max = 40) int pairsOfFive, @ForAll boolean upper) {
        List<BigDecimal> plates = plateHundredths.stream().map(SessionTableTests::hundredths).toList();
        BigDecimal bar = new BigDecimal("20");
        BigDecimal from = bar.add(BigDecimal.valueOf(10L * pairsOfFive));
        BigDecimal step = SessionTable.stepKg(upper ? BodyRegion.UPPER : BodyRegion.LOWER, P);
        Optional<GymStore.Gym> gym = Optional.of(gym(bar, plates, List.of(), null));

        Optional<BigDecimal> heavier = SessionTable.heavier(ExerciseCatalog.Equipment.BARBELL, "bench_press", gym, from, step);
        Optional<BigDecimal> lighter = SessionTable.lighter(ExerciseCatalog.Equipment.BARBELL, "bench_press", gym, from, step);

        heavier.ifPresent(kg -> {
            assertThat(kg).isGreaterThan(from).isLessThanOrEqualTo(from.add(step));
            assertThat(LoadSteps.platesPerSide(kg, bar, plates)).as(kg + " with " + plates).isPresent();
        });
        lighter.ifPresent(kg -> {
            assertThat(kg).isLessThan(from).isPositive();
            assertThat(LoadSteps.platesPerSide(kg, bar, plates)).as(kg + " with " + plates).isPresent();
        });
        // Lighter can't hurt: over the empty bar there is always one (ADR-075 #3, "kilo çıkmazsa ne olacak").
        assertThat(lighter.isPresent()).as("lighter over the bar").isEqualTo(pairsOfFive > 0);
    }

    @Property
    void withoutAGymTheStepIsExactlyTheEngines(@ForAll @IntRange(min = 1, max = 4000) int fromTenths, @ForAll boolean upper) {
        BigDecimal from = tenths(fromTenths);
        BigDecimal step = SessionTable.stepKg(upper ? BodyRegion.UPPER : BodyRegion.LOWER, P);

        assertThat(SessionTable.heavier(ExerciseCatalog.Equipment.BARBELL, "bench_press", Optional.empty(), from, step))
                .hasValueSatisfying(kg -> assertThat(kg).isEqualByComparingTo(from.add(step)));
        Optional<BigDecimal> lighter = SessionTable.lighter(ExerciseCatalog.Equipment.BARBELL, "bench_press", Optional.empty(), from, step);
        if (from.compareTo(step) > 0) {
            assertThat(lighter).hasValueSatisfying(kg -> assertThat(kg).isEqualByComparingTo(from.subtract(step)));
        } else {
            assertThat(lighter).as("no load at or under nothing").isEmpty();
        }
    }

    @Provide
    Arbitrary<List<Integer>> racks() {
        return Arbitraries.integers().between(10, 600).list().ofMinSize(1).ofMaxSize(15).uniqueElements();
    }

    @Provide
    Arbitrary<List<Integer>> plateSets() {
        return Arbitraries.of(125, 250, 500, 1000, 1500, 2000, 2500, 113, 227, 454, 1134, 2041).list().ofMinSize(1).ofMaxSize(5).uniqueElements();
    }

    private static Function<BigDecimal, LoadSteps.Rounding> unknown() {
        return load -> new LoadSteps.Rounding.Unknown();
    }

    private static GymStore.Gym named(String name) {
        return switch (name) {
            case "full" -> FULL_PLATES;
            case "fives" -> FIVES_ONLY;
            case "halves" -> HALVES;
            case "rack" -> RACK;
            case "stack" -> STACK_OF_FIVE;
            default -> throw new IllegalArgumentException(name);
        };
    }

    private static GymStore.Gym gym(BigDecimal bar, List<BigDecimal> plates, List<BigDecimal> dumbbells, BigDecimal stackStep) {
        return new GymStore.Gym(null, "Test", true, bar, plates, dumbbells, stackStep, Map.of());
    }

    private static List<BigDecimal> weights(String... kg) {
        return java.util.Arrays.stream(kg).map(BigDecimal::new).toList();
    }

    private static TrainingLog.WorkSet set(String kg, int reps, Integer rir) {
        return new TrainingLog.WorkSet("bench_press", Instant.parse("2026-10-05T18:00:00Z"), ExerciseCatalog.Load.EXTERNAL, new BigDecimal(kg), reps,
                rir, null);
    }

    private static BigDecimal tenths(int tenths) {
        return BigDecimal.valueOf(tenths, 1);
    }

    private static BigDecimal hundredths(int hundredths) {
        return BigDecimal.valueOf(hundredths, 2);
    }
}
