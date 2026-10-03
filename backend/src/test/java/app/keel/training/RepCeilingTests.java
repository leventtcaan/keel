package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.RepRange;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * The rep ceiling on a sparse rack (K-534, ADR-045 #73): one more rep than the weakest set, never past the range's top +
 * the ceiling. Whether a target is at the ceiling is the server's to say (PlannedExercise.rackEnds): a session held for
 * form can be past it without the rack ending (K-534 review).
 */
class RepCeilingTests {

    @ParameterizedTest(name = "{0}")
    @CsvSource({
        "the first rep past the top,          8, 12, 12, 5, 13",
        "one under the ceiling,               8, 12, 15, 5, 16",
        "one more reaches the ceiling,        8, 12, 16, 5, 17",
        "at the ceiling the target stays,     8, 12, 17, 5, 17",
        "a set past the ceiling does not raise it, 8, 12, 22, 5, 17",
        "a low range,                         3, 5, 9, 5, 10",
        "another ceiling,                     6, 10, 11, 2, 12"})
    void oneMoreRepUpToTheCeiling(String name, int min, int max, int weakest, int ceilingAbove, int expected) {
        assertThat(NextTargets.oneMore(new RepRange(min, max), weakest, ceilingAbove)).isEqualTo(expected);
    }
}
