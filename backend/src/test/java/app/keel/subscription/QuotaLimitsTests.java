package app.keel.subscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalStateException;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

/** The daily limits as quota.yaml states them (K-508): a whole number of at least 1 for each use, or the server stops. */
class QuotaLimitsTests {

    private static QuotaLimits read(String messages, String photos) {
        String yaml = "parameters:\n  - key: coach_messages_per_day\n    value: " + messages + "\n  - key: photo_analyses_per_day\n    value: " + photos + "\n";
        return QuotaLimits.fromYaml(new ByteArrayInputStream(yaml.getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void eachUseHasItsOwnLimit() {
        QuotaLimits limits = read("25", "10");

        assertThat(limits.perDay(Quota.Use.COACH_MESSAGE)).isEqualTo(25);
        assertThat(limits.perDay(Quota.Use.PHOTO_ANALYSIS)).isEqualTo(10);
        assertThat(QuotaLimits.fromClasspath().perDay(Quota.Use.COACH_MESSAGE)).isPositive();
    }

    @Test
    void aLimitThatIsNotAWholeNumberOfAtLeastOneStopsTheServer() {
        for (String bad : new String[] {"0", "-1", "'25'", "2.5", "~"}) {
            assertThatIllegalStateException().as(bad).isThrownBy(() -> read(bad, "10")).withMessageContaining("coach_messages_per_day");
        }
        assertThatIllegalStateException().isThrownBy(() -> QuotaLimits.fromYaml(new ByteArrayInputStream(
                "parameters:\n  - key: coach_messages_per_day\n    value: 25\n".getBytes(StandardCharsets.UTF_8)))).withMessageContaining("photo_analyses_per_day");
    }
}
