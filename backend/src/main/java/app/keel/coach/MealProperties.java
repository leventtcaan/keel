package app.keel.coach;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * A meal in words (K-504, keel.coach.meal): how long the user's words may be, how many items and how long a food's
 * words the model may give back, how many foods are offered for each, and the words no food is looked up by ("and",
 * "with": they match half the database).
 */
@ConfigurationProperties("keel.coach.meal")
record MealProperties(Integer maxTextChars, Integer maxItems, Integer maxFoodChars, Integer candidates, java.util.List<String> stopWords) {

    MealProperties {
        if (maxTextChars == null || maxItems == null || maxFoodChars == null || candidates == null || maxTextChars < 1 || maxItems < 1
                || maxFoodChars < 1 || candidates < 1) {
            throw new IllegalStateException("keel.coach.meal: max-text-chars, max-items, max-food-chars and candidates are at least 1");
        }
        stopWords = stopWords == null ? java.util.List.of() : java.util.List.copyOf(stopWords);
    }
}
