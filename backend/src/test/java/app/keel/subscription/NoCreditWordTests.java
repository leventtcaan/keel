package app.keel.subscription;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/**
 * The daily limit is not a currency (K-508, ADR-004: the "Coins" crisis): no copy speaks of credits, coins or tokens to
 * spend — in English or Turkish.
 */
class NoCreditWordTests {

    @Test
    void noCopyTalksOfCreditsOrCoins() throws Exception {
        String copy = Files.readString(Path.of("../data/copy/en.json"));

        assertThat(Pattern.compile("(?i)\\b(credits?|coins?|kredi\\w*|jeton\\w*)\\b").matcher(copy).results().map(match -> match.group()).toList())
                .isEmpty();
    }
}
