package app.keel.engine.spec;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.Action;
import app.keel.engine.DecisionPipeline;
import app.keel.engine.Decision;
import app.keel.engine.MacroResult;
import app.keel.engine.MacroTargets;
import app.keel.engine.ParameterKey;
import app.keel.engine.RuleId;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;

/**
 * The weekly check-in specification, run through the assembled engine (K-112; ADR-009: the pending tag came off here).
 * One test per row of spec/weekly-checkin.yaml: {@link SpecScenario} turns {@code given} into a Snapshot, and the
 * decision must match {@code expect} — the action, and where the row names them the deciding rule, the direction and
 * size of a calorie step, the lever and the deload volume. Rows are never deleted to make this green.
 */
class WeeklyCheckinSpecTests {

    @TestFactory
    Stream<DynamicTest> weeklyCheckinFollowsTheSpecification() throws IOException {
        return WeeklyCheckinSpec.rows().stream().map(row -> DynamicTest.dynamicTest(
                row.get("id") + " · " + row.get("title"), () -> check(row)));
    }

    @SuppressWarnings("unchecked")
    private static void check(Map<String, Object> row) {
        Map<String, Object> given = (Map<String, Object>) row.get("given");
        Map<String, Object> expect = (Map<String, Object>) row.get("expect");
        SpecScenario.Built built = SpecScenario.from(given);
        Decision decision = DecisionPipeline.decide(built.snapshot(), built.parameters());
        String where = row.get("id") + " → " + decision;

        assertThat(decision.action().type().name()).as(where).isEqualTo(expect.get("action"));
        if (expect.get("reason") instanceof String reason) {
            assertThat(decision.reasons().getFirst().rule()).as(where).isEqualTo(new RuleId(reason));
        }
        if (decision.action() instanceof Action.AdjustCalories(int kcal)) {
            if (expect.get("direction") instanceof String direction) {
                assertThat(kcal > 0 ? "up" : "down").as(where).isEqualTo(direction);
            }
            if (expect.get("step_param") instanceof String param) {
                assertThat(Math.abs(kcal)).as(where)
                        .isEqualTo(built.parameters().wholeNumber(ParameterKey.valueOf(param.toUpperCase(Locale.ROOT))));
            }
            if ("carbs".equals(expect.get("macro"))) {
                // The step lands on carbs only: protein and fat are the same before and after (G3 K-10).
                int before = built.snapshot().energy().orElseThrow().targetKcal();
                var ageYears = built.snapshot().profile().orElseThrow().ageYears();
                BigDecimal kg = built.snapshot().weights().weighIns().getLast().kg();
                var old = ((MacroResult.Split) MacroTargets.forTarget(before, kg, built.snapshot().sex(), ageYears, built.parameters())).macros();
                var now = ((MacroResult.Split) MacroTargets.forTarget(before + kcal, kg, built.snapshot().sex(), ageYears, built.parameters())).macros();
                assertThat(now.proteinG()).as(where).isEqualTo(old.proteinG());
                assertThat(now.fatG()).as(where).isEqualTo(old.fatG());
                assertThat(now.carbsG()).as(where).isGreaterThan(old.carbsG());
            }
        }
        if (decision.action() instanceof Action.Deload(BigDecimal setsFactor) && expect.get("volume_factor_param") instanceof String param) {
            assertThat(setsFactor).as(where).isEqualByComparingTo(
                    BigDecimal.valueOf(built.parameters().number(ParameterKey.valueOf(param.toUpperCase(Locale.ROOT)))));
        }
    }
}
