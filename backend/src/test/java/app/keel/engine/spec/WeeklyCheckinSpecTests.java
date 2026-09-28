package app.keel.engine.spec;

import static org.junit.jupiter.api.Assertions.fail;

import java.io.IOException;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.TestFactory;

/**
 * The weekly check-in specification as executable tests — PENDING (ADR-009).
 *
 * <p>One dynamic test per row of spec/weekly-checkin.yaml. They fail on purpose until the engine exists:
 * run {@code ./gradlew pendingTest} to see what is left. The first step of K-101/K-106 (skill gorev-baslat)
 * is to remove the {@code pending} tag, build a Snapshot from each row's {@code given}, and assert the
 * engine's Decision against {@code expect}. Do not delete rows to make this green.
 */
@Tag("pending")
class WeeklyCheckinSpecTests {

    @TestFactory
    Stream<DynamicTest> weeklyCheckinFollowsTheSpecification() throws IOException {
        return WeeklyCheckinSpec.rows().stream().map(row -> DynamicTest.dynamicTest(
                row.get("id") + " · " + row.get("title"),
                () -> fail("Engine not implemented yet (K-106). Expected: " + expected(row)
                        + " — source: " + row.get("source"))));
    }

    private static Object expected(Map<String, Object> row) {
        return row.get("expect");
    }
}
