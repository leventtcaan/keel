package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** Plurals and typos in a food query (K-1061); no database needed. */
class FoodSearchPluralsTests {

    @Test
    void aPluralIsReadAsItsSingularToo() {
        assertThat(FoodSearchTerms.singular("eggs")).isEqualTo("egg");
        assertThat(FoodSearchTerms.singular("bananas")).isEqualTo("banana");
        assertThat(FoodSearchTerms.singular("tomatoes")).isEqualTo("tomato");
        assertThat(FoodSearchTerms.singular("potatoes")).isEqualTo("potato");
        assertThat(FoodSearchTerms.singular("berries")).isEqualTo("berry");
        assertThat(FoodSearchTerms.singular("sandwiches")).isEqualTo("sandwich");
        assertThat(FoodSearchTerms.singular("peaches")).isEqualTo("peach");
        assertThat(FoodSearchTerms.singular("fries")).isEqualTo("fry");
    }

    @Test
    void aWordThatOnlyLooksPluralIsLeftAlone() {
        for (String word : new String[] {"hummus", "asparagus", "swiss", "citrus", "egg", "rice", "oz", "gas", "his"}) {
            assertThat(FoodSearchTerms.singular(word)).as(word).isEqualTo(word);
        }
    }

    @Test
    void aNameMayHoldTheWordAsTypedOrItsSingular() {
        FoodSearchTerms terms = FoodSearchTerms.of("Blueberries pancakes");

        assertThat(terms.variants(0)).containsExactly("blueberries", "blueberry");
        assertThat(terms.variants(1)).containsExactly("pancakes", "pancake");
        assertThat(terms.containsAny(0)).containsExactly("%blueberries%", "%blueberry%");
        assertThat(FoodSearchTerms.of("rice").variants(0)).containsExactly("rice");
        assertThat(terms.singulars().words()).containsExactly("blueberry", "pancake");
    }

    @Test
    void aTypoIsLookedForOnlyInWordsOfFourLettersOrMoreMadeOfLetters() {
        FoodSearchTerms terms = FoodSearchTerms.of("egg bananna egg_ 100% chıcken");

        assertThat(terms.words()).containsExactly("egg", "bananna", "egg_", "100%", "chicken");
        assertThat(terms.fuzzy(0)).as("three letters: egg and leg are different foods").isFalse();
        assertThat(terms.fuzzy(1)).isTrue();
        assertThat(terms.fuzzy(2)).as("the underscore is text, not a typo of egg").isFalse();
        assertThat(terms.fuzzy(3)).isFalse();
        assertThat(terms.fuzzy(4)).isTrue();
    }

    @Test
    void likeWildcardsStayEscapedInTheVariants() {
        assertThat(FoodSearchTerms.of("100%_pures").containsAny(0)).containsExactly("%100\\%\\_pures%", "%100\\%\\_pure%");
    }
}
