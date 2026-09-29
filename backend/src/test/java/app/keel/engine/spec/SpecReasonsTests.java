package app.keel.engine.spec;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;

import app.keel.engine.RuleId;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.junit.jupiter.api.Test;

/** Every reason the specification expects is a valid RuleId, so the engine can actually emit it (K-101). */
class SpecReasonsTests {

    @Test
    void everyExpectedReasonIsAValidRuleId() throws IOException {
        List<String> reasons = WeeklyCheckinSpec.rows().stream()
                .map(row -> (Map<?, ?>) row.get("expect"))
                .map(expect -> (String) expect.get("reason"))
                .filter(Objects::nonNull)
                .toList();

        assertThat(reasons).isNotEmpty();
        reasons.forEach(reason -> assertThatNoException().as(reason).isThrownBy(() -> new RuleId(reason)));
    }
}
