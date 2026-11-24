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
    void textIsComposedBeforeItIsFoldedSoADecomposedLetterFoldsLikeItsPrecomposedOne() {
        // s + cedilla, g + breve, c + cedilla, o + diaeresis, u + diaeresis, I + dot above, i + dot above (what lower-casing İ leaves)
        assertThat(FoodSearchTerms.fold("s\u0327g\u0306c\u0327o\u0308u\u0308I\u0307i\u0307")).isEqualTo("sgcouii");
        assertThat(FoodSearchTerms.fold("C\u0327orba")).isEqualTo(FoodSearchTerms.fold("Çorba")).isEqualTo("corba");
        assertThat(FoodSearchTerms.of("mercimek c\u0327orbasi").words()).containsExactly("mercimek", "corbasi");
    }

    @Test
    void theLegacyFoldKeepsTheLettersTheOldSearchTextKept() {
        assertThat(FoodSearchTerms.ofLegacy("Çorba ISPANAK İ").words()).containsExactly("çorba", "ispanak", "i");
    }

    @Test
    void theLetterListTheMigrationFoldsWithIsTheOneTheCodeFoldsWith() throws Exception {
        String sql = java.nio.file.Files.readString(java.nio.file.Path.of("src/main/resources/db/migration/V64__nutrition_turkish_dishes.sql"));

        assertThat(sql).contains("'" + FoodSearchTerms.TURKISH_LETTERS + "' || chr(" + (int) FoodSearchTerms.COMBINING_DOT + ")")
                .contains("'" + FoodSearchTerms.PLAIN_LETTERS + "'");
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
