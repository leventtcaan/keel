package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import net.jqwik.api.constraints.IntRange;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;
import tools.jackson.databind.json.JsonMapper;

/**
 * Rounding a load to what a gym can make and the plates per side (K-414, ADR-032). The cases are
 * contracts/fixtures/load-steps.json, which the app's implementation (K-417) reads too; the properties hold for any gym.
 */
class LoadStepsTests {

    private static final Path CASES = Path.of("../contracts/fixtures/load-steps.json");

    @TestFactory
    @SuppressWarnings("unchecked")
    Stream<DynamicTest> theSharedRoundingCases() throws IOException {
        List<Map<String, Object>> cases = (List<Map<String, Object>>) fixture().get("round");
        assertThat(cases).isNotEmpty();
        return cases.stream().map(c -> DynamicTest.dynamicTest((String) c.get("case"), () -> {
            LoadSteps.Rounding rounding = LoadSteps.round(ExerciseCatalog.Equipment.valueOf((String) c.get("equipment")), (String) c.get("exerciseId"),
                    gym((Map<String, Object>) c.get("gym")), kg(c.get("lastKg")), kg(c.get("targetKg")));
            Object expected = c.get("expect");
            switch (String.valueOf(expected)) {
                case "NO_HEAVIER" -> assertThat(rounding).isEqualTo(new LoadSteps.Rounding.NoHeavier());
                case "UNKNOWN" -> assertThat(rounding).isEqualTo(new LoadSteps.Rounding.Unknown());
                default -> assertThat(rounding).isInstanceOfSatisfying(LoadSteps.Rounding.To.class,
                        to -> assertThat(to.kg()).isEqualByComparingTo(kg(expected)));
            }
        }));
    }

    @TestFactory
    @SuppressWarnings("unchecked")
    Stream<DynamicTest> theSharedPlateCases() throws IOException {
        List<Map<String, Object>> cases = (List<Map<String, Object>>) fixture().get("platesPerSide");
        assertThat(cases).isNotEmpty();
        return cases.stream().map(c -> DynamicTest.dynamicTest((String) c.get("case"), () -> {
            Optional<List<BigDecimal>> plates = LoadSteps.platesPerSide(kg(c.get("totalKg")), kg(c.get("baseKg")), kgs(c.get("platesKg")));
            if (c.get("expect") == null) {
                assertThat(plates).isEmpty();
            } else {
                assertThat(plates).hasValueSatisfying(found -> assertThat(found).usingElementComparator(BigDecimal::compareTo)
                        .containsExactlyElementsOf(kgs(c.get("expect"))));
            }
        }));
    }

    @Property
    void aRoundedDumbbellIsOnTheRackHeavierThanTheLastAndNoneIsCloser(@ForAll("racks") List<Integer> rackTenths,
            @ForAll @IntRange(min = 10, max = 600) int lastTenths, @ForAll @IntRange(min = 1, max = 100) int stepTenths) {
        List<BigDecimal> rack = rackTenths.stream().map(LoadStepsTests::tenths).toList();
        BigDecimal last = tenths(lastTenths);
        BigDecimal target = last.add(tenths(stepTenths));
        LoadSteps.Rounding rounding = LoadSteps.round(ExerciseCatalog.Equipment.DUMBBELL, "dumbbell_curl", gymWith(null, List.of(), rack), last, target);

        List<BigDecimal> heavier = rack.stream().filter(kg -> kg.compareTo(last) > 0).toList();
        if (heavier.isEmpty()) {
            assertThat(rounding).isEqualTo(new LoadSteps.Rounding.NoHeavier());
            return;
        }
        assertThat(rounding).isInstanceOfSatisfying(LoadSteps.Rounding.To.class, to -> {
            assertThat(heavier).usingElementComparator(BigDecimal::compareTo).contains(to.kg());
            BigDecimal distance = to.kg().subtract(target).abs();
            assertThat(heavier).allSatisfy(other -> {
                int closer = other.subtract(target).abs().compareTo(distance);
                assertThat(closer > 0 || closer == 0 && other.compareTo(to.kg()) >= 0).as(other + " vs " + to.kg()).isTrue();
            });
        });
    }

    @Property
    void aRoundedBarbellLoadIsOneThePlatesMakeAndHeavierThanTheLast(@ForAll("plateSets") List<Integer> plateHundredths,
            @ForAll @IntRange(min = 0, max = 40) int pairsOfFive, @ForAll @IntRange(min = 1, max = 1000) int stepHundredths) {
        List<BigDecimal> plates = plateHundredths.stream().map(LoadStepsTests::hundredths).toList();
        BigDecimal bar = new BigDecimal("20");
        BigDecimal last = bar.add(BigDecimal.valueOf(10L * pairsOfFive));
        BigDecimal target = last.add(hundredths(stepHundredths));

        LoadSteps.Rounding rounding = LoadSteps.round(ExerciseCatalog.Equipment.BARBELL, "bench_press", gymWith(bar, plates, List.of()), last, target);

        assertThat(rounding).isInstanceOfSatisfying(LoadSteps.Rounding.To.class, to -> {
            assertThat(to.kg()).isGreaterThan(last);
            assertThat(LoadSteps.platesPerSide(to.kg(), bar, plates)).as(to.kg() + " with " + plates).isPresent();
        });
    }

    @Property
    void thePlatesPerSideMakeTheTotalWithTheFewestPlates(@ForAll("plateSets") List<Integer> plateHundredths,
            @ForAll @IntRange(min = 0, max = 4000) int perSideHundredths) {
        List<BigDecimal> plates = plateHundredths.stream().map(LoadStepsTests::hundredths).toList();
        BigDecimal base = new BigDecimal("20");
        BigDecimal total = base.add(hundredths(2 * perSideHundredths));

        Optional<List<BigDecimal>> found = LoadSteps.platesPerSide(total, base, plates);
        int fewest = fewestByBruteForce(perSideHundredths, plateHundredths);

        if (fewest < 0) {
            assertThat(found).isEmpty();
            return;
        }
        assertThat(found).hasValueSatisfying(side -> {
            assertThat(side.stream().reduce(BigDecimal.ZERO, BigDecimal::add)).isEqualByComparingTo(hundredths(perSideHundredths));
            assertThat(side).hasSize(fewest).allSatisfy(plate -> assertThat(plates).usingElementComparator(BigDecimal::compareTo).contains(plate));
            assertThat(side).isSortedAccordingTo(Comparator.reverseOrder());
        });
    }

    @Provide
    Arbitrary<List<Integer>> racks() {
        // At least one dumbbell: an empty rack says nothing (UNKNOWN, a shared case).
        return Arbitraries.integers().between(10, 600).list().ofMinSize(1).ofMaxSize(15).uniqueElements();
    }

    @Provide
    Arbitrary<List<Integer>> plateSets() {
        // Plate sizes in hundredths of a kg, kg sets and lb sets stored in kg alike.
        return Arbitraries.of(125, 250, 500, 1000, 1500, 2000, 2500, 113, 227, 454, 1134, 2041, 50, 25).list().ofMinSize(1).ofMaxSize(5).uniqueElements();
    }

    /** The fewest plates that make the amount (unbounded pairs), -1 when none do: a plain search, no shortcut. */
    private static int fewestByBruteForce(int amount, List<Integer> plates) {
        int[] fewest = new int[amount + 1];
        java.util.Arrays.fill(fewest, Integer.MAX_VALUE);
        fewest[0] = 0;
        for (int a = 1; a <= amount; a++) {
            for (int plate : plates) {
                if (plate <= a && fewest[a - plate] != Integer.MAX_VALUE) {
                    fewest[a] = Math.min(fewest[a], fewest[a - plate] + 1);
                }
            }
        }
        return fewest[amount] == Integer.MAX_VALUE ? -1 : fewest[amount];
    }

    private static GymStore.Gym gymWith(BigDecimal bar, List<BigDecimal> plates, List<BigDecimal> dumbbells) {
        return new GymStore.Gym(null, "Test", true, bar, plates, dumbbells, null, Map.of());
    }

    @SuppressWarnings("unchecked")
    private static GymStore.Gym gym(Map<String, Object> gym) {
        Map<String, BigDecimal> machines = new LinkedHashMap<>();
        ((Map<String, Object>) gym.get("machines")).forEach((id, step) -> machines.put(id, kg(step)));
        return new GymStore.Gym(null, "Test", true, gym.get("barKg") == null ? null : kg(gym.get("barKg")), kgs(gym.get("platesKg")),
                kgs(gym.get("dumbbellsKg")), gym.get("stackStepKg") == null ? null : kg(gym.get("stackStepKg")), machines);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> fixture() throws IOException {
        return JsonMapper.builder().build().readValue(Files.readString(CASES), Map.class);
    }

    private static List<BigDecimal> kgs(Object list) {
        List<BigDecimal> kgs = new ArrayList<>();
        for (Object kg : (List<?>) list) {
            kgs.add(kg(kg));
        }
        return kgs;
    }

    private static BigDecimal kg(Object kg) {
        return new BigDecimal(kg.toString());
    }

    private static BigDecimal tenths(int tenths) {
        return BigDecimal.valueOf(tenths, 1);
    }

    private static BigDecimal hundredths(int hundredths) {
        return BigDecimal.valueOf(hundredths, 2);
    }
}
