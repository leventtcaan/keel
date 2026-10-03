package app.keel.coach;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * A meal in words (K-504, keel.coach.meal): how long the user's words may be, how many items and how long a food's
 * words the model may give back, and how many foods are offered for each.
 */
@ConfigurationProperties("keel.coach.meal")
record MealProperties(Integer maxTextChars, Integer maxItems, Integer maxFoodChars, Integer candidates) {

    MealProperties {
        if (maxTextChars == null || maxItems == null || maxFoodChars == null || candidates == null || maxTextChars < 1 || maxItems < 1
                || maxFoodChars < 1 || candidates < 1) {
            throw new IllegalStateException("keel.coach.meal: max-text-chars, max-items, max-food-chars and candidates are at least 1");
        }
    }
}
