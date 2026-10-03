package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * What the model may say about a meal photo (K-514, ADR-004, ADR-046): the foods it sees and, for each, how many grams by
 * eye — the portion hint — exactly {"items": [{"food", "quantity", "unit": "g"}]}. A photo has no measure of the user's to
 * keep, and a serving the model names ("1 cup") would read as measured when it was only seen: grams by eye are an
 * estimate, so the range is wide and the gram question is asked (U5). Any other reply is dropped whole.
 */
class PhotoAnalysisSchemaTests {

    private static final MealReplyCheck PHOTO = MealReplyCheck.grams(20, new BigDecimal("5000"), 100, ForbiddenWords.fromClasspath());

    @Test
    void theFoodsSeenAndTheirGramsByEyeAreRead() {
        assertThat(PHOTO.read("{\"items\":[{\"food\":\"rice white cooked\",\"quantity\":180,\"unit\":\"g\"},{\"food\":\"chicken breast grilled\",\"quantity\":120.5,\"unit\":\"G\"}]}"))
                .contains(List.of(new MealReplyCheck.Item("rice white cooked", new BigDecimal("180"), "g"),
                        new MealReplyCheck.Item("chicken breast grilled", new BigDecimal("120.5"), "g")));
        assertThat(PHOTO.read("{\"items\":[]}")).as("no meal in the photo").contains(List.of());
    }

    @Test
    void aPortionIsGramsAndNothingElse() {
        assertThat(PHOTO.read("{\"items\":[{\"food\":\"rice\",\"quantity\":1,\"unit\":\"cup\"}]}")).as("a serving seen would read as measured").isEmpty();
        assertThat(PHOTO.read("{\"items\":[{\"food\":\"milk\",\"quantity\":200,\"unit\":\"ml\"}]}")).isEmpty();
        assertThat(PHOTO.read("{\"items\":[{\"food\":\"rice\",\"quantity\":1,\"unit\":\"bowl\"},{\"food\":\"egg\",\"quantity\":50,\"unit\":\"g\"}]}"))
                .as("one item off drops the reply").isEmpty();
        assertThat(PHOTO.read("{\"items\":[{\"food\":\"rice\",\"quantity\":5000.01,\"unit\":\"g\"}]}")).isEmpty();
        assertThat(PHOTO.read("{\"items\":[{\"food\":\"rice\",\"quantity\":0,\"unit\":\"g\"}]}")).isEmpty();
    }

    @Test
    void aMealInWordsKeepsTheUsersMeasure() {
        // The words' check is the one it was (K-504): the user's measure stays a measure.
        MealReplyCheck words = new MealReplyCheck(20, new BigDecimal("5000"), 100, ForbiddenWords.fromClasspath());
        assertThat(words.read("{\"items\":[{\"food\":\"rice\",\"quantity\":1,\"unit\":\"cup\"}]}"))
                .contains(List.of(new MealReplyCheck.Item("rice", new BigDecimal("1"), "cup")));
    }
}
