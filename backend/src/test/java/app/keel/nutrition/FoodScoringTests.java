package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
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

    static final FoodScoring.Settings SETTINGS;
    static final FoodRanking.Weights WEIGHTS;

    static {
        YamlPropertiesFactoryBean yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new ClassPathResource("application.yml"));
        Properties properties = yaml.getObject();
        Binder binder = new Binder(new MapConfigurationPropertySource(properties));
        SETTINGS = binder.bind("keel.nutrition.search.score", FoodScoring.Settings.class).get();
        WEIGHTS = binder.bind("keel.nutrition.search", FoodRanking.Weights.class).get();
    }

    private static double score(String query, String name, String brand, String source) {
        return FoodScoring.score(name, brand, source, false, FoodSearchTerms.of(query), SETTINGS, WEIGHTS);
    }

    @Test
    void aGenericFoodBeatsEveryBrandedNameThatHoldsTheSameWords() {
        double generic = score("chicken breast", "Chicken, breast, raw", null, "FOUNDATION");

        // A flood of products: the name is the query itself, or the query and more, from any brand.
        assertThat(score("chicken breast", "Chicken Breast", "Tyson", "BRANDED")).isLessThan(generic);
        for (String name : new String[] {"Chicken breast fillets", "Chicken breast nuggets, breaded", "Grilled chicken breast strips", "Chicken Breast Tenders"}) {
            assertThat(score("chicken breast", name, "Perdue", "BRANDED")).as(name).isLessThan(generic);
        }
    }

    @Test
    void theSecondWordChangesTheOrder() {
        // Both start with "chicken" and hold "breast": the one with the words side by side in the query's order is first.
        double together = score("chicken breast", "Chicken breast meal", null, "BRANDED");
        double apart = score("chicken breast", "Chicken meal with breast", null, "BRANDED");
        double reversed = score("chicken breast", "Breast of chicken meal", null, "BRANDED");

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
        assertThat(score("eggs", "Egg, whole, raw", null, "FOUNDATION")).isCloseTo(score("egg", "Egg, whole, raw", null, "FOUNDATION"), org.assertj.core.data.Offset.offset(1e-9));
    }

    @Test
    void adr085RuleChickenNamesThatStartWithItBeforeOneHoldingItLaterAndFoundationBeforeBranded() {
        // FoodMappingTests.searchFindsEveryWordAndPutsNamesThatStartWithItFirst, without a database.
        double roasted = score("chicken", "Chicken breast, roasted", null, "FOUNDATION");
        double nuggets = score("chicken", "Chicken nuggets", "Frozen Brand", "BRANDED");
        double later = score("chicken", "Rice with chicken", null, "SR_LEGACY");

        assertThat(roasted).isGreaterThan(nuggets);
        assertThat(nuggets).isGreaterThan(later);
    }

    @Test
    void adr085RuleRiceFirstWordAndCommaBeforeFirstWordBeforeAWordLaterInTheName() {
        // FoodSearchRankingTests.aNameThatStartsWithTheWordComesBeforeOneThatHoldsItLater: a better source does not overturn the word.
        for (String query : new String[] {"rice", "rice white"}) {
            double comma = score(query, "Rice, white, long-grain, cooked", null, "SR_LEGACY");
            double flour = score(query, "Rice flour, white", null, "FOUNDATION");

            assertThat(comma).as(query).isGreaterThan(flour);
        }
        assertThat(score("rice", "Rice flour, white", null, "FOUNDATION")).isGreaterThan(score("rice", "Brown rice, cooked", null, "FOUNDATION"));
    }

    @Test
    void adr085RuleEggTheNameThenTheCommaFormThenNamesThatStartWithTheLettersThenALaterWord() {
        // FoodSearchRankingTests.theWholeFoodComesBeforeTheFoodsThatOnlyStartWithTheLetters.
        double[] order = {score("egg", "Egg", null, "SR_LEGACY"), score("egg", "Egg, whole, raw", null, "FOUNDATION"),
                score("egg", "Eggnog", null, "FOUNDATION"), score("egg", "Eggplant, raw", null, "FOUNDATION"),
                score("egg", "Fried egg sandwich", null, "FOUNDATION")};

        for (int i = 1; i < order.length; i++) {
            assertThat(order[i - 1]).as("place " + i).isGreaterThan(order[i]);
        }
    }

    @Test
    void aPluralNameIsTheWordItselfNotAPrefixOfIt() {
        // K-1061: the product that is exactly "Eggs" outranks "Eggplant", for "egg" and for "eggs".
        for (String query : new String[] {"egg", "eggs"}) {
            assertThat(score(query, "Eggs", "Kirkland", "BRANDED")).as(query).isGreaterThan(score(query, "Eggplant, raw", null, "FOUNDATION"));
        }
        assertThat(FoodScoring.tier("eggs", List.of("egg"))).isZero();
        assertThat(score("eggs", "Eggs", null, "SR_LEGACY")).isGreaterThan(score("eggs", "Eggplant, raw", null, "FOUNDATION"));
        assertThat(score("eggs", "Eggs", null, "SR_LEGACY")).isGreaterThan(score("eggs", "Egg, whole, raw", null, "FOUNDATION"));
        // The generic food of the singular still leads the product called Eggs (ADR-085 #8, K-1061).
        assertThat(score("egg", "Egg, whole, raw", null, "FOUNDATION")).isGreaterThan(score("egg", "Eggs", "Kirkland", "BRANDED"));
        // "apple": Apples and "Apple, raw" before "Applesauce".
        assertThat(score("apple", "Apples", "Farm", "BRANDED")).isGreaterThan(score("apple", "Applesauce, canned", null, "FOUNDATION"));
        assertThat(score("apple", "Apple, raw", null, "FOUNDATION")).isGreaterThan(score("apple", "Applesauce, canned", null, "FOUNDATION"));
        // ADR-085 #8: first word and a comma ("Rice, white") is a better step than the first word alone ("Rice cakes").
        assertThat(score("rice", "Rice, white, cooked", null, "SR_LEGACY")).isGreaterThan(score("rice", "Rice cakes", null, "SR_LEGACY"));
    }

    @Test
    void theSourceBreaksTheTieFoundationFirst() {
        double foundation = score("rice", "Rice, white", null, "FOUNDATION");
        double legacy = score("rice", "Rice, white", null, "SR_LEGACY");
        double survey = score("rice", "Rice, white", null, "FNDDS");
        double branded = score("rice", "Rice, white", "Uncle", "BRANDED");

        assertThat(foundation).isGreaterThan(legacy);
        assertThat(legacy).isGreaterThan(survey);
        assertThat(survey).isGreaterThan(branded);
    }

    @Test
    void aBrandWordWinsTheProduct() {
        double product = score("chobani yogurt", "Greek Yogurt, Strawberry", "Chobani", "BRANDED");
        double other = score("chobani yogurt", "Greek Yogurt, Strawberry", "Fage", "BRANDED");

        assertThat(product).isGreaterThan(other + WEIGHTS.brandBonus() - 1.0);
    }

    @Test
    void aTypoCostsButAGenericFoodSpelledAlikeStillBeatsSloppyExactNames() {
        double alike = score("chiken breast", "Chicken, breast, raw", null, "FOUNDATION");
        double exactJunk = score("chiken breast", "Chiken breast fillet", "X", "BRANDED");

        assertThat(alike).isGreaterThan(exactJunk);
        assertThat(alike).isLessThan(score("chicken breast", "Chicken, breast, raw", null, "FOUNDATION"));
    }

    @Test
    void theUsersRegionAddsItsBonus() {
        FoodSearchTerms terms = FoodSearchTerms.of("kefir");

        assertThat(FoodScoring.score("Kefir plain", "Pinar", "BRANDED", true, terms, SETTINGS, WEIGHTS)
                - FoodScoring.score("Kefir plain", "Pinar", "BRANDED", false, terms, SETTINGS, WEIGHTS)).isCloseTo(WEIGHTS.regionBonus(), org.assertj.core.data.Offset.offset(1e-9));
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

        assertThatThrownBy(() -> new FoodScoring.Settings(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, bonus, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new FoodScoring.Settings(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, null, 1, 1, 1, 1, 1, 14, 1, 1, 1, 1)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new FoodScoring.Settings(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, bonus, 1, 1, 0, 1, 1, 14, 1, 1, 1, 1)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new FoodScoring.Settings(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, bonus, 1, 1, 1, 1, 1, 14, 1, 1, 0, 1)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new FoodScoring.Settings(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, bonus, 1, 1, 1, 1, 1, 14, 1, 1, 1, -1)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new FoodScoring.Settings(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, bonus, 1, 1, 1, 1, 1, 14, 0, 1, 1, 1)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aRecentLogWeighsMoreThanAnOldOne() {
        // The weight of a log is decided by the database (exp decay); what the ranking does with a fractional weight is decided here.
        assertThat(FoodRanking.bonus(new FoodRanking.Popularity(0.5, 0), WEIGHTS)).isEqualTo(4);
        assertThat(FoodRanking.bonus(new FoodRanking.Popularity(0.95, 0), WEIGHTS)).isGreaterThan(FoodRanking.bonus(new FoodRanking.Popularity(0.2, 0), WEIGHTS));
        assertThat(FoodRanking.bonus(new FoodRanking.Popularity(0.01, 0), WEIGHTS)).isZero();
    }
}
