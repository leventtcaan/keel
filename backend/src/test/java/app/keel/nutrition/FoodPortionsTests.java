package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * The ways to log a food and where to start (K-1061, ADR-090 #1 and #5): a countable by the piece, a product by its label
 * serving, 100 g only when the database knows nothing else. No database here.
 */
class FoodPortionsTests {

    private static final FoodPortions.Settings SETTINGS = new FoodPortions.Settings(
            List.of("mini", "extra small", "small", "medium", "large", "extra large", "jumbo"));

    private static FoodStore.Serving serving(String name, String grams) {
        return new FoodStore.Serving(name, new BigDecimal(grams));
    }

    private static FoodStore.Food food(String name, FoodRanges.Source source, String kcal, String gramsPerMl, FoodStore.Serving... servings) {
        return new FoodStore.Food("test:" + name, name, null, source, new FoodRanges.Per100g(new BigDecimal(kcal), new BigDecimal("10"),
                new BigDecimal("20"), new BigDecimal("5")), gramsPerMl == null ? null : new BigDecimal(gramsPerMl), List.of(servings));
    }

    private static List<String> units(FoodPortions.Portions portions) {
        return portions.portions().stream().map(FoodPortions.Portion::unit).toList();
    }

    @Test
    void anEggStartsAtOneLargeNotAHundredGrams() {
        // SR Legacy's order is not the order of sizes: the middle size by weight is the egg people mean.
        FoodStore.Food egg = food("Egg, whole, raw", FoodRanges.Source.ANALYSED, "143", "1.03", serving("1 extra large", "56"), serving("1 large", "50"),
                serving("1 medium", "44"), serving("1 small", "38"), serving("1 jumbo", "63"), serving("1 cup", "243"));

        FoodPortions.Portions portions = FoodPortions.of(egg, SETTINGS);

        assertThat(portions.defaultAmount()).isEqualTo(new FoodEstimator.Amount(BigDecimal.ONE, "1 large", null));
        assertThat(portions.portions().getFirst().unit()).as("the default leads").isEqualTo("1 large");
        assertThat(units(portions)).containsExactly("1 large", "1 extra large", "1 medium", "1 small", "1 jumbo", "1 cup", "g", "oz", "ml");
    }

    @Test
    void aBananaStartsAtOneMediumTheMiddleOfItsSizes() {
        FoodStore.Food banana = food("Bananas, raw", FoodRanges.Source.ANALYSED, "89", null, serving("1 cup, mashed", "225"),
                serving("1 extra small (less than 6\" long)", "81"), serving("1 small (6\" to 6-7/8\" long)", "101"),
                serving("1 medium (7\" to 7-7/8\" long)", "118"), serving("1 large (8\" to 8-7/8\" long)", "136"),
                serving("1 extra large (9\" or longer)", "152"));

        assertThat(FoodPortions.of(banana, SETTINGS).defaultAmount().unit()).isEqualTo("1 medium (7\" to 7-7/8\" long)");
    }

    @Test
    void breadStartsAtItsFirstPieceNotItsCup() {
        FoodStore.Food bread = food("Bread, white", FoodRanges.Source.ANALYSED, "266", null, serving("1 slice", "25"), serving("1 cup, cubes", "30"));

        FoodPortions.Portions portions = FoodPortions.of(bread, SETTINGS);

        assertThat(portions.defaultAmount().unit()).isEqualTo("1 slice");
        assertThat(portions.portions().getFirst().kind()).isEqualTo(FoodPortions.Kind.PIECE);
    }

    @Test
    void aProductStartsAtItsLabelServingWhateverItIs() {
        FoodStore.Food cereal = food("Cheerios Cereal", FoodRanges.Source.BRANDED, "357", "0.118", serving("1 cup (28g)", "28"));

        FoodPortions.Portions portions = FoodPortions.of(cereal, SETTINGS);

        assertThat(portions.defaultAmount()).isEqualTo(new FoodEstimator.Amount(BigDecimal.ONE, "1 cup (28g)", null));
        assertThat(portions.portions().getFirst().kind()).isEqualTo(FoodPortions.Kind.SERVING);
        assertThat(units(portions)).containsExactly("1 cup (28g)", "g", "oz", "ml");
    }

    @Test
    void withoutAPieceRiceStartsAtACupThenAServing() {
        FoodStore.Food rice = food("Rice, white, cooked", FoodRanges.Source.ANALYSED, "130", "0.668", serving("3 oz", "85"), serving("1 cup", "158"));
        FoodStore.Food nlea = food("Chips", FoodRanges.Source.ANALYSED, "536", null, serving("1 cup", "30"), serving("1 NLEA serving", "28"));

        assertThat(FoodPortions.of(rice, SETTINGS).defaultAmount().unit()).as("a volume before a weight").isEqualTo("1 cup");
        assertThat(FoodPortions.of(nlea, SETTINGS).defaultAmount().unit()).as("a serving before a cup").isEqualTo("1 NLEA serving");
    }

    @Test
    void onlyAWeightMeasureStartsAtThatWeight() {
        FoodStore.Food beef = food("Beef, ground", FoodRanges.Source.ANALYSED, "250", null, serving("3 oz", "85"));

        assertThat(FoodPortions.of(beef, SETTINGS).defaultAmount().unit()).isEqualTo("3 oz");
    }

    @Test
    void aFoodWithNoHouseholdMeasureStartsAtAHundredGramsAndHasGAndOz() {
        FoodStore.Food plain = food("Mystery", FoodRanges.Source.ANALYSED, "100", null);

        FoodPortions.Portions portions = FoodPortions.of(plain, SETTINGS);

        assertThat(portions.defaultAmount()).isEqualTo(new FoodEstimator.Amount(new BigDecimal("100"), "g", null));
        assertThat(units(portions)).containsExactly("g", "oz");
    }

    @Test
    void mlIsOfferedOnlyWhereTheDensityIsKnown() {
        FoodStore.Food milk = food("Milk", FoodRanges.Source.ANALYSED, "61", "1.031", serving("1 cup", "244"));

        FoodPortions.Portion ml = FoodPortions.of(milk, SETTINGS).portions().stream().filter(portion -> portion.unit().equals("ml")).findFirst().orElseThrow();

        assertThat(ml.kind()).isEqualTo(FoodPortions.Kind.VOLUME);
        assertThat(ml.grams()).isEqualByComparingTo("1.031");
    }

    @Test
    void eachPortionCarriesTheFoodsNumbersForOneOfItAsSingleNumbers() {
        // 143 kcal, 10 g protein, 20 g carbohydrate, 5 g fat a hundred grams: one large egg of 50 g is half of that.
        FoodStore.Food egg = food("Egg, whole, raw", FoodRanges.Source.ANALYSED, "143", null, serving("1 large", "50"));

        FoodPortions.Portions portions = FoodPortions.of(egg, SETTINGS);

        FoodPortions.Portion large = portions.portions().getFirst();
        assertThat(large.grams()).isEqualByComparingTo("50");
        assertThat(large.kcal()).isEqualByComparingTo("71.5");
        assertThat(large.proteinG()).isEqualByComparingTo("5");
        assertThat(large.carbsG()).isEqualByComparingTo("10");
        assertThat(large.fatG()).isEqualByComparingTo("2.5");
        FoodPortions.Portion gram = portions.portions().stream().filter(portion -> portion.unit().equals("g")).findFirst().orElseThrow();
        assertThat(gram.kcal()).as("a gram").isEqualByComparingTo("1.43");
        FoodPortions.Portion ounce = portions.portions().stream().filter(portion -> portion.unit().equals("oz")).findFirst().orElseThrow();
        assertThat(ounce.grams()).isEqualByComparingTo("28.35");
        assertThat(ounce.kcal()).as("an ounce is 28.35 g").isEqualByComparingTo("40.5398");
    }

    @Test
    void theKindOfAServingIsReadFromItsName() {
        FoodStore.Food generic = food("x", FoodRanges.Source.ANALYSED, "1", null);

        assertThat(FoodPortions.kind(generic, "1 large")).isEqualTo(FoodPortions.Kind.PIECE);
        assertThat(FoodPortions.kind(generic, "1 cup, chopped")).isEqualTo(FoodPortions.Kind.MEASURE);
        assertThat(FoodPortions.kind(generic, "3 oz")).isEqualTo(FoodPortions.Kind.MEASURE);
        assertThat(FoodPortions.kind(generic, "1 NLEA serving")).isEqualTo(FoodPortions.Kind.SERVING);
        assertThat(FoodPortions.kind(generic, "1 slice (1 oz)")).as("an ounce in brackets does not make a slice a weight").isEqualTo(FoodPortions.Kind.PIECE);
        assertThat(FoodPortions.kind(food("y", FoodRanges.Source.BRANDED, "1", null), "2 tbsp (30 g)")).isEqualTo(FoodPortions.Kind.SERVING);
    }

    @Test
    void aServingWithoutWeightIsNotAPortion() {
        FoodStore.Food odd = food("Odd", FoodRanges.Source.ANALYSED, "1", null, serving("1 large", "0.00001"));
        FoodStore.Food none = new FoodStore.Food("test:none", "None", null, FoodRanges.Source.ANALYSED,
                new FoodRanges.Per100g(BigDecimal.ONE, BigDecimal.ONE, BigDecimal.ONE, BigDecimal.ONE), null, List.of(new FoodStore.Serving("1 large", BigDecimal.ZERO)));

        assertThat(units(FoodPortions.of(none, SETTINGS))).containsExactly("g", "oz");
        assertThat(FoodPortions.of(odd, SETTINGS).portions().getFirst().unit()).isEqualTo("1 large");
    }
}
