package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Free text read into a meal (K-504, ADR-004, U1): the model says which foods and how much in the user's measure — exactly
 * {"items": [{"food", "quantity", "unit"}]} — and nothing else; a reply off that schema is dropped whole. It can never
 * carry what a food holds (the database's), nor turn a measure into grams.
 */
class MealReplyCheckTests {

    private static final MealReplyCheck CHECK = new MealReplyCheck(20, new BigDecimal("5000"), 100, ForbiddenWords.fromClasspath());

    private static String one(String item) {
        return "{\"items\":[" + item + "]}";
    }

    @Test
    void foodsAndAmountsInTheUsersMeasureAreRead() {
        assertThat(CHECK.read("{\"items\":[{\"food\":\"chicken breast\",\"quantity\":150,\"unit\":\"g\"},{\"food\":\"egg\",\"quantity\":2,\"unit\":\"Piece\"}]}"))
                .contains(List.of(new MealReplyCheck.Item("chicken breast", new BigDecimal("150"), "g"), new MealReplyCheck.Item("egg", new BigDecimal("2"), "piece")));
        assertThat(CHECK.read("{\"items\":[]}")).as("no food in the words: an empty meal").contains(List.of());
    }

    @Test
    void theModelCannotSayWhatAFoodHolds() {
        // The card's test: no calorie field, no nutrient field — the reply goes whole.
        assertThat(CHECK.read(one("{\"food\":\"rice\",\"quantity\":200,\"unit\":\"g\",\"kcal\":260}"))).isEmpty();
        assertThat(CHECK.read(one("{\"food\":\"rice\",\"quantity\":200,\"unit\":\"g\",\"protein\":5}"))).isEmpty();
        assertThat(CHECK.read("{\"items\":[{\"food\":\"rice\",\"quantity\":200,\"unit\":\"g\"}],\"totalKcal\":260}")).isEmpty();
        // Nor in the words shown: no digit in a food, no forbidden phrase (K-504 review).
        assertThat(CHECK.read(one("{\"food\":\"chicken 165 kcal\",\"quantity\":1,\"unit\":\"piece\"}"))).isEmpty();
        assertThat(CHECK.read(one("{\"food\":\"chicken for insulin resistance\",\"quantity\":1,\"unit\":\"piece\"}"))).isEmpty();
    }

    @Test
    void aQuantityIsARealOneToTwoDecimals() {
        assertThat(CHECK.read(one("{\"food\":\"rice\",\"quantity\":52.6667,\"unit\":\"g\"}")))
                .contains(List.of(new MealReplyCheck.Item("rice", new BigDecimal("52.67"), "g")));
        assertThat(CHECK.read(one("{\"food\":\"rice\",\"quantity\":0.001,\"unit\":\"g\"}"))).as("rounds to nothing").isEmpty();
        assertThat(CHECK.read(one("{\"food\":\"rice\",\"quantity\":0,\"unit\":\"g\"}"))).isEmpty();
        assertThat(CHECK.read(one("{\"food\":\"rice\",\"quantity\":-50,\"unit\":\"g\"}"))).isEmpty();
        assertThat(CHECK.read(one("{\"food\":\"rice\",\"quantity\":5000.01,\"unit\":\"g\"}"))).isEmpty();
        assertThat(CHECK.read(one("{\"food\":\"rice\",\"quantity\":5000,\"unit\":\"g\"}"))).isPresent();
        assertThat(CHECK.read(one("{\"food\":\"rice\",\"quantity\":1e400,\"unit\":\"g\"}"))).as("not a 500").isEmpty();
        assertThat(CHECK.read(one("{\"food\":\"rice\",\"quantity\":\"200\",\"unit\":\"g\"}"))).as("a number, not text").isEmpty();
        assertThat(CHECK.read(one("{\"food\":\"rice\",\"unit\":\"g\"}"))).isEmpty();
    }

    @Test
    void aUnitIsAWordAndAFoodAFewWords() {
        assertThat(CHECK.read(one("{\"food\":\"rice\",\"quantity\":1,\"unit\":\"cup2\"}"))).isEmpty();
        assertThat(CHECK.read(one("{\"food\":\"rice\",\"quantity\":1,\"unit\":\" \"}"))).isEmpty();
        assertThat(CHECK.read(one("{\"food\":\" \",\"quantity\":100,\"unit\":\"g\"}"))).isEmpty();
        assertThat(CHECK.read(one("{\"food\":\"" + "a".repeat(101) + "\",\"quantity\":100,\"unit\":\"g\"}"))).isEmpty();
        assertThat(CHECK.read(one("{\"food\":5,\"quantity\":100,\"unit\":\"g\"}"))).isEmpty();
    }

    @Test
    void aMealIsAListAndNotTooLong() {
        assertThat(CHECK.read("{}")).as("the fake told nothing").isEmpty();
        assertThat(CHECK.read("not json")).isEmpty();
        assertThat(CHECK.read("```json\n{\"items\":[]}\n```")).isEmpty();
        assertThat(CHECK.read("{\"items\":{\"food\":\"rice\",\"quantity\":100,\"unit\":\"g\"}}")).isEmpty();
        String many = "{\"items\":[" + String.join(",", java.util.Collections.nCopies(21, "{\"food\":\"rice\",\"quantity\":100,\"unit\":\"g\"}")) + "]}";
        assertThat(CHECK.read(many)).isEmpty();
    }
}
