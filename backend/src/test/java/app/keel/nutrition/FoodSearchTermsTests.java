package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** What a search query is folded to before the database compares it (ADR-085 #7); no database needed. */
class FoodSearchTermsTests {

    @Test
    void theTurkishIsAreFoldedToPlainIAndEverythingIsLowerCase() {
        assertThat(FoodSearchTerms.fold("chıcken")).isEqualTo("chicken");
        assertThat(FoodSearchTerms.fold("CHİCKEN")).isEqualTo("chicken");
        assertThat(FoodSearchTerms.fold("ISPANAK")).isEqualTo("ispanak");
        assertThat(FoodSearchTerms.fold("İ")).as("no combining dot left behind").hasSize(1);
    }

    @Test
    void theWordsAreFoldedSplitOnWhitespaceAndTheFirstOneLeads() {
        FoodSearchTerms terms = FoodSearchTerms.of("  Rice   WHITE ");

        assertThat(terms.words()).containsExactly("rice", "white");
        assertThat(terms.first()).isEqualTo("rice");
        assertThat(terms.whole()).isEqualTo("rice white");
    }

    @Test
    void likeWildcardsInAWordMatchThemselves() {
        FoodSearchTerms terms = FoodSearchTerms.of("100%_pure a\\b");

        assertThat(terms.contains()).containsExactly("%100\\%\\_pure%", "%a\\\\b%");
        assertThat(terms.firstEscaped()).isEqualTo("100\\%\\_pure");
    }
}
