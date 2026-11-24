package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.source.MapConfigurationPropertySource;
import org.springframework.core.io.ClassPathResource;

/**
 * The text score of the food search read off every word of the query (K-1208): no database, the weights are the ones of application.yml.
 * The foods are written as (name, brand, source); the score is what {@link FoodScoring#score} says of them.
 */
class FoodScoringTests {

    private static final FoodScoring.Settings SETTINGS;
    private static final FoodRanking.Weights WEIGHTS;

    static {
        YamlPropertiesFactoryBean yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new ClassPathResource("application.yml"));
        Properties properties = yaml.getObject();
        Binder binder = new Binder(new MapConfigurationPropertySource(properties));
        SETTINGS = binder.bind("keel.nutrition.search.score", FoodScoring.Settings.class).get();
        WEIGHTS = binder.bind("keel.nutrition.search", FoodRanking.Weights.class).get();
    }

    private static int score(String query, String name, String brand, String source) {
        return FoodScoring.score(name, brand, source, false, FoodSearchTerms.of(query), SETTINGS, WEIGHTS);
    }

    @Test
    void aGenericFoodBeatsEveryBrandedNameThatHoldsTheSameWords() {
        int generic = score("chicken breast", "Chicken, breast, raw", null, "FOUNDATION");

        // A flood of products: the name is the query itself, or the query and more, from any brand.
        assertThat(score("chicken breast", "Chicken Breast", "Tyson", "BRANDED")).isLessThan(generic);
        assertThat(score("chicken breast", "Chicken Breast", "Chicken Breast Co", "BRANDED")).isLessThan(generic);
        for (String name : new String[] {"Chicken breast fillets", "Chicken breast nuggets, breaded", "Grilled chicken breast strips", "Chicken Breast Tenders"}) {
            assertThat(score("chicken breast", name, "Perdue", "BRANDED")).as(name).isLessThan(generic);
        }
    }

    @Test
    void theSecondWordChangesTheOrder() {
        // Both start with "chicken" and hold "breast": the one with the words side by side in the query's order is first.
        int together = score("chicken breast", "Chicken breast meal", null, "BRANDED");
        int apart = score("chicken breast", "Chicken meal with breast", null, "BRANDED");
        int reversed = score("chicken breast", "Breast of chicken meal", null, "BRANDED");

        assertThat(together).isGreaterThan(apart);
        assertThat(apart).isGreaterThan(reversed);
        // The same name for another second word: "chicken soup" is not helped by "breast".
        assertThat(score("chicken soup", "Chicken breast meal", null, "BRANDED")).isLessThan(score("chicken soup", "Chicken soup, canned", null, "BRANDED"));
    }

    @Test
    void aWordThatStartsAWordOfTheNameBeatsOneInsideIt() {
        assertThat(score("breast", "Chicken, breast", null, "BRANDED")).isGreaterThan(score("breast", "Chicken breastbone", null, "BRANDED"));
        assertThat(score("egg", "Egg, whole, raw", null, "FOUNDATION")).isGreaterThan(score("egg", "Eggplant, raw", null, "FOUNDATION"));
        assertThat(score("egg", "Eggplant, raw", null, "FOUNDATION")).isGreaterThan(score("egg", "Deggy bread", null, "FOUNDATION"));
    }

    @Test
    void theNameThatIsTheQueryBeatsALongerOneAndAPluralIsTheSingular() {
        assertThat(score("egg", "Eggs", "Kirkland", "BRANDED")).isGreaterThan(score("egg", "Eggs, scrambled with cheese and ham", "Kirkland", "BRANDED"));
        assertThat(score("eggs", "Egg, whole, raw", null, "FOUNDATION")).isEqualTo(score("egg", "Egg, whole, raw", null, "FOUNDATION"));
    }

    @Test
    void theSourceBreaksTheTieFoundationFirst() {
        int foundation = score("rice", "Rice, white", null, "FOUNDATION");
        int legacy = score("rice", "Rice, white", null, "SR_LEGACY");
        int survey = score("rice", "Rice, white", null, "FNDDS");
        int branded = score("rice", "Rice, white", "Uncle", "BRANDED");

        assertThat(foundation).isGreaterThan(legacy);
        assertThat(legacy).isGreaterThan(survey);
        assertThat(survey).isGreaterThan(branded);
    }

    @Test
    void aBrandWordWinsTheProductAndOnlyForAWordTheNameLacks() {
        int product = score("chobani yogurt", "Greek Yogurt, Strawberry", "Chobani", "BRANDED");
        int other = score("chobani yogurt", "Greek Yogurt, Strawberry", "Fage", "BRANDED");

        assertThat(product).isGreaterThan(other + WEIGHTS.brandBonus() - 1);
        // "egg" is in the name of the product already: a brand called Eggland's earns nothing for it.
        assertThat(score("egg", "Large Eggs", "Eggland's Best", "BRANDED")).isEqualTo(score("egg", "Large Eggs", "Best", "BRANDED"));
    }

    @Test
    void aTypoCostsButAGenericFoodSpelledAlikeStillBeatsSloppyExactNames() {
        int alike = score("chiken breast", "Chicken, breast, raw", null, "FOUNDATION");
        int exactJunk = score("chiken breast", "Chiken breast fillet", "X", "BRANDED");

        assertThat(alike).isGreaterThan(exactJunk);
        assertThat(alike).isLessThan(score("chicken breast", "Chicken, breast, raw", null, "FOUNDATION"));
    }

    @Test
    void theUsersRegionAddsItsBonus() {
        FoodSearchTerms terms = FoodSearchTerms.of("kefir");

        assertThat(FoodScoring.score("Kefir plain", "Pinar", "BRANDED", true, terms, SETTINGS, WEIGHTS)
                - FoodScoring.score("Kefir plain", "Pinar", "BRANDED", false, terms, SETTINGS, WEIGHTS)).isEqualTo(WEIGHTS.regionBonus());
    }

    @Test
    void editDistanceCountsOneLetterInsertedDeletedOrChanged() {
        assertThat(FoodScoring.distance("chiken", "chicken")).isEqualTo(1);
        assertThat(FoodScoring.distance("avacado", "avocado")).isEqualTo(1);
        assertThat(FoodScoring.distance("bananna", "banana")).isEqualTo(1);
        assertThat(FoodScoring.distance("beans", "beef")).isEqualTo(3);
        assertThat(FoodScoring.distance("", "ab")).isEqualTo(2);
    }

    @Test
    void settingsThatCannotScoreAreRefused() {
        Map<String, Integer> bonus = Map.of("FOUNDATION", 1);

        assertThatThrownBy(() -> new FoodScoring.Settings(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, bonus, 1, 1, 1, 1, 1, 0, 1, 1, 1)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new FoodScoring.Settings(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, null, 1, 1, 1, 1, 1, 14, 1, 1, 1)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new FoodScoring.Settings(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, bonus, 1, 1, 0, 1, 1, 14, 1, 1, 1)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new FoodScoring.Settings(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, bonus, 1, 1, 1, 1, 1, 14, 0, 1, 1)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aRecentLogWeighsMoreThanAnOldOne() {
        // The weight of a log is decided by the database (exp decay); what the ranking does with a fractional weight is decided here.
        assertThat(FoodRanking.bonus(new FoodRanking.Popularity(0.5, 0), WEIGHTS)).isEqualTo(4);
        assertThat(FoodRanking.bonus(new FoodRanking.Popularity(0.95, 0), WEIGHTS)).isGreaterThan(FoodRanking.bonus(new FoodRanking.Popularity(0.2, 0), WEIGHTS));
        assertThat(FoodRanking.bonus(new FoodRanking.Popularity(0.01, 0), WEIGHTS)).isZero();
    }
}
