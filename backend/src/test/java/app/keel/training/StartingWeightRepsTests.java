package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalStateException;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

/**
 * The reps the onboarding asks a starting weight for (ADR-072 #5, "about 8 times"): read from the phone's own file,
 * data/parameters/onboarding.json, so the question and the server's rule are one number; without it the server stops.
 */
class StartingWeightRepsTests {

    private static StartingWeightReps read(String value) {
        String json = "{\"parameters\": [{\"key\": \"starting_weight_reps\", \"value\": " + value + "}]}";
        return StartingWeightReps.fromJson(new ByteArrayInputStream(json.getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void theRepsAreTheOnesTheOnboardingAsksFor() {
        assertThat(read("8").reps()).isEqualTo(8);
        assertThat(StartingWeightReps.fromClasspath().reps()).as("ADR-072 #5: about 8 times").isEqualTo(8);
    }

    @Test
    void repsThatAreNotAWholeNumberOfAtLeastOneStopTheServer() {
        for (String bad : new String[] {"0", "-1", "\"8\"", "8.5", "null"}) {
            assertThatIllegalStateException().as(bad).isThrownBy(() -> read(bad)).withMessageContaining("starting_weight_reps");
        }
        assertThatIllegalStateException().isThrownBy(() -> StartingWeightReps.fromJson(new ByteArrayInputStream(
                "{\"parameters\": []}".getBytes(StandardCharsets.UTF_8)))).withMessageContaining("starting_weight_reps");
    }
}
