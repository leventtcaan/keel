package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Free text read into a meal (K-504, ADR-004, U1): the model says which foods and how much — exactly
 * {"items": [{"food", "grams"}]} — and nothing else; a reply off that schema is dropped whole. Above all it can never carry
 * a calorie or a nutrient: those are the database's.
 */
class MealReplyCheckTests {

    private static final MealReplyCheck CHECK = new MealReplyCheck(20, new BigDecimal("5000"), 100);

    @Test
    void foodsAndGramsAreRead() {
        assertThat(CHECK.read("{\"items\":[{\"food\":\"chicken breast\",\"grams\":150},{\"food\":\"rice\",\"grams\":200.5}]}"))
                .contains(List.of(new MealReplyCheck.Item("chicken breast", new BigDecimal("150")), new MealReplyCheck.Item("rice", new BigDecimal("200.5"))));
    }

    @Test
    void theModelCannotSayWhatAFoodHolds() {
        // The card's test: no calorie field, no nutrient field — the reply goes whole.
        assertThat(CHECK.read("{\"items\":[{\"food\":\"rice\",\"grams\":200,\"kcal\":260}]}")).isEmpty();
        assertThat(CHECK.read("{\"items\":[{\"food\":\"rice\",\"grams\":200,\"protein\":5}]}")).isEmpty();
        assertThat(CHECK.read("{\"items\":[{\"food\":\"rice\",\"grams\":200}],\"totalKcal\":260}")).isEmpty();
    }

    @Test
    void anAmountIsARealOne() {
        assertThat(CHECK.read("{\"items\":[{\"food\":\"rice\",\"grams\":0}]}")).isEmpty();
        assertThat(CHECK.read("{\"items\":[{\"food\":\"rice\",\"grams\":-50}]}")).isEmpty();
        assertThat(CHECK.read("{\"items\":[{\"food\":\"rice\",\"grams\":5000.01}]}")).isEmpty();
        assertThat(CHECK.read("{\"items\":[{\"food\":\"rice\",\"grams\":5000}]}")).isPresent();
        assertThat(CHECK.read("{\"items\":[{\"food\":\"rice\",\"grams\":\"200\"}]}")).as("a number, not text").isEmpty();
        assertThat(CHECK.read("{\"items\":[{\"food\":\"rice\"}]}")).isEmpty();
    }

    @Test
    void aFoodIsAFewWords() {
        assertThat(CHECK.read("{\"items\":[{\"food\":\" \",\"grams\":100}]}")).isEmpty();
        assertThat(CHECK.read("{\"items\":[{\"food\":\"" + "a".repeat(101) + "\",\"grams\":100}]}")).isEmpty();
        assertThat(CHECK.read("{\"items\":[{\"food\":5,\"grams\":100}]}")).isEmpty();
    }

    @Test
    void aMealHasItemsAndNotTooMany() {
        assertThat(CHECK.read("{\"items\":[]}")).isEmpty();
        assertThat(CHECK.read("{}")).as("the fake told nothing").isEmpty();
        assertThat(CHECK.read("not json")).isEmpty();
        assertThat(CHECK.read("{\"items\":{\"food\":\"rice\",\"grams\":100}}")).isEmpty();
        String many = "{\"items\":[" + String.join(",", java.util.Collections.nCopies(21, "{\"food\":\"rice\",\"grams\":100}")) + "]}";
        assertThat(CHECK.read(many)).isEmpty();
    }
}
