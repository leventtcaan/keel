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
    void theTurkishLettersAreFoldedToTheirPlainLettersSoAKeyboardWithoutThemFindsTheDish() {
        assertThat(FoodSearchTerms.fold("Mercimek Çorbası")).isEqualTo("mercimek corbasi");
        assertThat(FoodSearchTerms.fold("ŞİŞ KÖFTE ÜZÜM Ğ")).isEqualTo("sis kofte uzum g");
        assertThat(FoodSearchTerms.fold("çoban salata")).isEqualTo(FoodSearchTerms.fold("COBAN SALATA"));
        assertThat(FoodSearchTerms.TURKISH_LETTERS).as("the database's translate() maps one letter to one letter")
                .hasSameSizeAs(FoodSearchTerms.PLAIN_LETTERS);
        assertThat(FoodSearchTerms.of("corbasi").words()).containsExactly("corbasi");
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
