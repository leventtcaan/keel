package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.math.BigDecimal;
import java.util.List;
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
    @SuppressWarnings("unchecked")
    void theMealScreenShowsNoMoreRecentFoodsThanTheServerSends() throws Exception {
        // K-1025: the phone's food.json quick_recent_max is how many of the server's recent-foods the meal screen shows.
        java.util.Map<String, Object> phone = tools.jackson.databind.json.JsonMapper.builder().build().readValue(
                java.nio.file.Files.readString(java.nio.file.Path.of("../data/parameters/food.json")), java.util.Map.class);
        int shown = ((List<java.util.Map<String, Object>>) phone.get("parameters")).stream().filter(p -> "quick_recent_max".equals(p.get("key")))
                .map(p -> ((Number) p.get("value")).intValue()).findFirst().orElseThrow();
        java.util.Map<String, Object> yaml;
        try (var reader = java.nio.file.Files.newBufferedReader(java.nio.file.Path.of("src/main/resources/application.yml"))) {
            yaml = new org.yaml.snakeyaml.Yaml().load(reader);
        }
        java.util.Map<String, Object> nutrition = (java.util.Map<String, Object>) ((java.util.Map<String, Object>) yaml.get("keel")).get("nutrition");

        assertThat(shown).as("food.json quick_recent_max").isBetween(1, (Integer) nutrition.get("recent-foods"));
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
