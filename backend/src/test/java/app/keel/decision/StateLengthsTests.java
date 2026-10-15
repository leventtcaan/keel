package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalStateException;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

/**
 * The lengths a declared state is offered for (K-1021, ADR-077 #6: 3 and 7 days): read from the phone's own file,
 * data/parameters/state.json, so the chips and the server's rule are one list; without it the server stops.
 */
class StateLengthsTests {

    private static StateLengths read(String value) {
        String json = "{\"parameters\": [{\"key\": \"state_until_choices_days\", \"value\": " + value + "}]}";
        return StateLengths.fromJson(new ByteArrayInputStream(json.getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void theLengthsAreThreeAndSevenDays() {
        assertThat(StateLengths.fromClasspath().days()).as("ADR-077 #6").containsExactly(3, 7);
    }

    @Test
    void onlyAnOfferedLengthIsOffered() {
        StateLengths lengths = read("[3, 7]");
        assertThat(lengths.offers(3)).isTrue();
        assertThat(lengths.offers(7)).isTrue();
        for (int other : new int[] {-3, 0, 1, 2, 4, 6, 8, 14, 30, Integer.MAX_VALUE}) {
            assertThat(lengths.offers(other)).as("days " + other).isFalse();
        }
    }

    @Test
    void lengthsThatAreNotAListOfWholeDaysStopTheServer() {
        for (String bad : new String[] {"[]", "[0]", "[-3]", "[3, 3]", "[\"3\"]", "[3.5]", "3", "null", "[3, null]"}) {
            assertThatIllegalStateException().as(bad).isThrownBy(() -> read(bad)).withMessageContaining("state_until_choices_days");
        }
        assertThatIllegalStateException().isThrownBy(() -> StateLengths.fromJson(new ByteArrayInputStream(
                "{\"parameters\": []}".getBytes(StandardCharsets.UTF_8)))).withMessageContaining("state_until_choices_days");
    }
}
