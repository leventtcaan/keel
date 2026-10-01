package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.function.UnaryOperator;
import java.util.stream.IntStream;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/**
 * What a gym can be (K-414, ADR-032): a name, a bar, plate sizes, the dumbbells on the rack, a stack step and the
 * machines with their own step. A gym that breaks these would round the next session's load to something the gym cannot
 * make.
 */
class GymRulesTests {

    private static final GymLimits LIMITS = new GymLimits(60, 20, 100, 100, new BigDecimal("100"), new BigDecimal("200"),
            new BigDecimal("100"), new BigDecimal("100"), 10);
    private static ExerciseCatalog catalog;

    @BeforeAll
    static void catalog() throws IOException {
        catalog = ExerciseCatalogTestData.catalog();
    }

    @Test
    void aFullGymIsValid() {
        assertThat(valid(UnaryOperator.identity())).isTrue();
    }

    @Test
    void aGymWithNothingButANameIsValid() {
        assertThat(GymRules.valid(new GymController.GymInput("Home", true, null, List.of(), List.of(), null, List.of()), LIMITS, catalog))
                .isTrue();
    }

    @Test
    void whetherTheGymIsInUseIsSaid() {
        assertThat(valid(gym -> new GymController.GymInput(gym.name(), null, gym.barKg(), gym.platesKg(), gym.dumbbellsKg(), gym.stackStepKg(),
                gym.machines()))).isFalse();
    }

    @Test
    void theNameIsThereAndShort() {
        assertThat(valid(gym -> with(gym, null, gym.barKg(), gym.platesKg(), gym.dumbbellsKg(), gym.machines()))).isFalse();
        assertThat(valid(gym -> with(gym, "  ", gym.barKg(), gym.platesKg(), gym.dumbbellsKg(), gym.machines()))).isFalse();
        assertThat(valid(gym -> with(gym, "x".repeat(61), gym.barKg(), gym.platesKg(), gym.dumbbellsKg(), gym.machines()))).isFalse();
        assertThat(valid(gym -> with(gym, "x".repeat(60), gym.barKg(), gym.platesKg(), gym.dumbbellsKg(), gym.machines()))).isTrue();
    }

    @Test
    void aWeightIsAboveZeroWithinItsCeilingAndAtMostTwoDecimals() {
        assertThat(valid(gym -> with(gym, gym.name(), kg("0"), gym.platesKg(), gym.dumbbellsKg(), gym.machines()))).as("a bar of 0").isFalse();
        assertThat(valid(gym -> with(gym, gym.name(), kg("100.01"), gym.platesKg(), gym.dumbbellsKg(), gym.machines()))).isFalse();
        assertThat(valid(gym -> with(gym, gym.name(), gym.barKg(), List.of(kg("0")), gym.dumbbellsKg(), gym.machines()))).isFalse();
        assertThat(valid(gym -> with(gym, gym.name(), gym.barKg(), List.of(kg("1.125")), gym.dumbbellsKg(), gym.machines()))).isFalse();
        assertThat(valid(gym -> with(gym, gym.name(), gym.barKg(), List.of(kg("-2.5")), gym.dumbbellsKg(), gym.machines()))).isFalse();
        assertThat(valid(gym -> with(gym, gym.name(), gym.barKg(), gym.platesKg(), List.of(kg("200.5")), gym.machines()))).isFalse();
        assertThat(valid(gym -> with(gym, gym.name(), gym.barKg(), gym.platesKg(), List.of(kg("200")), gym.machines()))).isTrue();
        assertThat(valid(gym -> new GymController.GymInput(gym.name(), gym.current(), gym.barKg(), gym.platesKg(), gym.dumbbellsKg(),
                kg("0"), gym.machines()))).as("a stack step of 0").isFalse();
    }

    @Test
    void aListHasNoRepeatsNoGapsAndKeepsItsCeiling() {
        assertThat(valid(gym -> with(gym, gym.name(), gym.barKg(), List.of(kg("20"), kg("20.00")), gym.dumbbellsKg(), gym.machines())))
                .as("20 and 20.00 are one plate").isFalse();
        assertThat(valid(gym -> with(gym, gym.name(), gym.barKg(), gym.platesKg(), nullIn(gym.dumbbellsKg()), gym.machines()))).isFalse();
        assertThat(valid(gym -> with(gym, gym.name(), gym.barKg(), null, gym.dumbbellsKg(), gym.machines()))).isFalse();
        assertThat(valid(gym -> with(gym, gym.name(), gym.barKg(), weights(21), gym.dumbbellsKg(), gym.machines()))).isFalse();
        assertThat(valid(gym -> with(gym, gym.name(), gym.barKg(), weights(20), weights(100), gym.machines()))).isTrue();
        assertThat(valid(gym -> with(gym, gym.name(), gym.barKg(), gym.platesKg(), weights(101), gym.machines()))).isFalse();
    }

    @Test
    void aMachineIsAMachineOrCableMoveOfTheCatalogNamedOnce() {
        GymController.GymMachine pecDeck = new GymController.GymMachine("pec_deck", kg("5"));
        assertThat(valid(gym -> with(gym, gym.name(), gym.barKg(), gym.platesKg(), gym.dumbbellsKg(), List.of(pecDeck)))).isTrue();
        assertThat(valid(gym -> with(gym, gym.name(), gym.barKg(), gym.platesKg(), gym.dumbbellsKg(), List.of(pecDeck, pecDeck)))).isFalse();
        assertThat(valid(gym -> with(gym, gym.name(), gym.barKg(), gym.platesKg(), gym.dumbbellsKg(),
                List.of(new GymController.GymMachine("bench_press", kg("5")))))).as("a barbell move").isFalse();
        assertThat(valid(gym -> with(gym, gym.name(), gym.barKg(), gym.platesKg(), gym.dumbbellsKg(),
                List.of(new GymController.GymMachine("teleporter", kg("5")))))).as("not in the catalog").isFalse();
        assertThat(valid(gym -> with(gym, gym.name(), gym.barKg(), gym.platesKg(), gym.dumbbellsKg(),
                List.of(new GymController.GymMachine("pec_deck", null))))).isFalse();
        assertThat(valid(gym -> with(gym, gym.name(), gym.barKg(), gym.platesKg(), gym.dumbbellsKg(), null))).isFalse();
    }

    private static boolean valid(UnaryOperator<GymController.GymInput> change) {
        GymController.GymInput full = new GymController.GymInput("Downtown", true, kg("20"),
                List.of(kg("25"), kg("20"), kg("15"), kg("10"), kg("5"), kg("2.5"), kg("1.25")),
                List.of(kg("2"), kg("4"), kg("6"), kg("8"), kg("10"), kg("12.5"), kg("15")), kg("5"),
                List.of(new GymController.GymMachine("lat_pulldown", kg("7"))));
        return GymRules.valid(change.apply(full), LIMITS, catalog);
    }

    private static GymController.GymInput with(GymController.GymInput gym, String name, BigDecimal barKg, List<BigDecimal> plates,
            List<BigDecimal> dumbbells, List<GymController.GymMachine> machines) {
        return new GymController.GymInput(name, gym.current(), barKg, plates, dumbbells, gym.stackStepKg(), machines);
    }

    private static List<BigDecimal> weights(int count) {
        return IntStream.rangeClosed(1, count).mapToObj(BigDecimal::valueOf).toList();
    }

    private static List<BigDecimal> nullIn(List<BigDecimal> weights) {
        List<BigDecimal> withNull = new ArrayList<>(weights);
        withNull.add(null);
        return Collections.unmodifiableList(withNull);
    }

    private static BigDecimal kg(String value) {
        return new BigDecimal(value);
    }
}
