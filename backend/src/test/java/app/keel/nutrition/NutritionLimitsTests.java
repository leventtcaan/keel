package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

/** The nutrition limits (keel.nutrition): a recent list that the candidates tried could never fill is a configuration error (K-1025). */
class NutritionLimitsTests {

    private static FoodController.NutritionLimits limits(int candidates, int recent) {
        return new FoodController.NutritionLimits(20, 50, 100, 50, new BigDecimal(5000), 50, 80, 100, 3, 28, candidates, recent);
    }

    @Test
    void recentFoodsAreAtLeastOneAndNoMoreThanTheCandidatesEstimated() {
        assertThat(limits(9, 5).recentFoods()).isEqualTo(5);
        assertThat(limits(9, 9).recentFoods()).as("as many as the candidates is the most").isEqualTo(9);
        assertThat(limits(9, 1).recentFoods()).isOne();
    }

    @Test
    void moreThanTheCandidatesOrNoneIsRefusedAtStartNotCutQuietly() {
        assertThatIllegalArgumentException().isThrownBy(() -> limits(9, 10)).withMessageContaining("recent-foods");
        assertThatIllegalArgumentException().isThrownBy(() -> limits(9, 0)).withMessageContaining("recent-foods");
    }

    @Test
    void theShippedSettingsAreValid() throws Exception {
        // application.yml as shipped: the pair is read the way the server reads it, so a wrong edit is red here too.
        java.util.Map<String, Object> yaml;
        try (var reader = java.nio.file.Files.newBufferedReader(java.nio.file.Path.of("src/main/resources/application.yml"))) {
            yaml = new org.yaml.snakeyaml.Yaml().load(reader);
        }
        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> nutrition = (java.util.Map<String, Object>) ((java.util.Map<String, Object>) yaml.get("keel")).get("nutrition");

        assertThat((Integer) nutrition.get("recent-foods")).isBetween(1, (Integer) nutrition.get("suggestion-candidates"));
    }
}
