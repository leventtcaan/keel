package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/**
 * The words no food name the model reads may carry (K-504), read in Java from the same file the app scans (K-302): every
 * pattern proves itself on its examples and near-misses, so a pattern that broke in one language's regular expressions
 * would show.
 */
class ForbiddenWordsTests {

    @Test
    void everyForbiddenPhraseAndNameReadsTheSameInJava() {
        // U4, U6 and person names (K-302, K-523): the rules' examples and near-misses, and ordinary coaching copy.
        assertThat(ForbiddenWords.fromClasspath().selfCheck()).isEmpty();
        assertThat(ForbiddenWords.fromClasspath().size()).isGreaterThanOrEqualTo(3);
    }
}
