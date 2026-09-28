package app.keel.engine.spec;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

/**
 * Keeps the specification table itself honest while its implementation is pending:
 * every row has an id, a known action and a source file that exists (U14).
 */
class WeeklyCheckinSpecTableTests {

    @Test
    void everyRowIsWellFormedAndSourced() throws IOException {
        List<String> actions = WeeklyCheckinSpec.actions();
        List<String> problems = new ArrayList<>();
        Set<String> ids = new HashSet<>();

        for (Map<String, Object> row : WeeklyCheckinSpec.rows()) {
            Object id = row.get("id");
            if (!(id instanceof String rowId) || !ids.add(rowId)) {
                problems.add("missing or duplicate id: " + id);
                continue;
            }
            if (!(row.get("given") instanceof Map<?, ?> given) || given.isEmpty()) {
                problems.add(rowId + ": empty given");
            }
            if (!(row.get("expect") instanceof Map<?, ?> expect) || !actions.contains(expect.get("action"))) {
                problems.add(rowId + ": expect.action must be one of " + actions);
            }
            if (!(row.get("source") instanceof String source)
                    || !Files.isRegularFile(Path.of("..").resolve(source.split("#", 2)[0]))) {
                problems.add(rowId + ": source file missing");
            }
        }

        assertThat(problems).as("specification table problems").isEmpty();
        assertThat(ids).hasSizeGreaterThanOrEqualTo(20);
    }
}
