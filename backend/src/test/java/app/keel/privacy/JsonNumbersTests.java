package app.keel.privacy;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** K-994: a number another account holds is looked for as a JSON value, never as a digit run inside an id. */
class JsonNumbersTests {

    @Test
    void aNumberAsAJsonValueIsFound() {
        assertThat("{\"steps\":12345}").containsPattern(JsonNumbers.asValue("12345"));
        assertThat("[12345,1]").containsPattern(JsonNumbers.asValue("12345"));
        assertThat("{\"kg\":\"93.7\"}").containsPattern(JsonNumbers.asValue("93.7"));
    }

    @Test
    void aDecimalColumnsTrailingZerosStillCount() {
        assertThat("{\"kg\":93.70}").containsPattern(JsonNumbers.asValue("93.7"));
        assertThat("{\"steps\":12345.0}").containsPattern(JsonNumbers.asValue("12345"));
    }

    @Test
    void theSameDigitsInsideAnIdOrAnotherNumberAreNot() {
        assertThat("{\"id\":\"0b812345-77aa-4c1e-9d3f-2a6b1c0d9e8f\"}").doesNotContainPattern(JsonNumbers.asValue("12345"));
        assertThat("{\"id\":\"12345abc-77aa-4c1e-9d3f-2a6b1c0d9e8f\"}").doesNotContainPattern(JsonNumbers.asValue("12345"));
        assertThat("{\"kg\":193.7}").doesNotContainPattern(JsonNumbers.asValue("93.7"));
        assertThat("{\"kg\":93.75}").doesNotContainPattern(JsonNumbers.asValue("93.7"));
    }
}
