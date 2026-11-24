package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalStateException;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * What the model costs and the monthly budget (ADR-092 #4): every call counted at the prices, or at the high estimate while
 * the prices are not known — never at nothing; once the month has cost the budget the coach answers in the engine's words, until
 * the month turns.
 */
class CoachSpendTests {

    private static final Map<Purpose, String> TYPES = Map.of(Purpose.EXPLAIN, "coach question", Purpose.PARSE_MEAL, "meal note", Purpose.PHOTO_MEAL,
            "meal photo");

    private static final class Ledger implements SpendLedger {
        final Map<LocalDate, BigDecimal> months = new HashMap<>();
        boolean broken;

        @Override
        public BigDecimal spent(LocalDate month) {
            return months.getOrDefault(month, BigDecimal.ZERO);
        }

        @Override
        public void add(LocalDate month, int inputTokens, int outputTokens, BigDecimal costUsd) {
            if (broken) {
                throw new IllegalStateException("database down");
            }
            months.merge(month, costUsd, BigDecimal::add);
        }
    }

    private static CoachProperties priced() {
        return new CoachProperties("fake", "Example AI", "m", 400, new BigDecimal("0.10"), new BigDecimal("0.40"), TYPES, 2000, 400);
    }

    private static CoachProperties unpriced() {
        return new CoachProperties("fake", "Example AI", "m", 400, null, null, TYPES, 2000, 400);
    }

    private static Clock at(String instant) {
        return Clock.fixed(Instant.parse(instant), ZoneOffset.UTC);
    }

    private static final CoachLimits LIMITS = new CoachLimits(new BigDecimal("1.00"), new BigDecimal("0.30"));

    @Test
    void aCallCostsItsTokensAtThePricesOrTheHighEstimateWhenTheyAreUnknown() {
        ModelReply reply = new ModelReply("{}", 1_000_000, 500_000);

        assertThat(new CoachSpend(new Ledger(), priced(), LIMITS, at("2026-12-10T10:00:00Z")).costOf(reply)).isEqualByComparingTo("0.30"); // 0.10 + 0.40 * 0.5
        assertThat(new CoachSpend(new Ledger(), unpriced(), LIMITS, at("2026-12-10T10:00:00Z")).costOf(new ModelReply("{}", 1, 1))).isEqualByComparingTo("0.30");
        assertThat(unpriced().priced()).isFalse();
    }

    @Test
    void theBudgetIsSpentWhenTheMonthHasCostIt() {
        Ledger ledger = new Ledger();
        CoachSpend spend = new CoachSpend(ledger, unpriced(), LIMITS, at("2026-12-10T10:00:00Z"));

        assertThat(spend.exhausted()).isFalse();
        for (int call = 0; call < 3; call++) {
            spend.record(new ModelReply("{}", 100, 20));
        }
        assertThat(spend.exhausted()).as("0.90 of 1.00").isFalse();
        spend.record(new ModelReply("{}", 100, 20));
        assertThat(spend.exhausted()).as("1.20 of 1.00").isTrue();
        assertThat(ledger.spent(LocalDate.of(2026, 12, 1))).isEqualByComparingTo("1.20");
    }

    @Test
    void theNextMonthStartsAgain() {
        Ledger ledger = new Ledger();
        ledger.months.put(LocalDate.of(2026, 12, 1), new BigDecimal("5"));

        assertThat(new CoachSpend(ledger, priced(), LIMITS, at("2026-12-31T23:59:59Z")).exhausted()).isTrue();
        assertThat(new CoachSpend(ledger, priced(), LIMITS, at("2027-01-01T00:00:00Z")).exhausted()).isFalse();
    }

    @Test
    void aLedgerThatCannotBeWrittenDoesNotLoseTheAnswer() {
        Ledger ledger = new Ledger();
        ledger.broken = true;

        new CoachSpend(ledger, priced(), LIMITS, at("2026-12-10T10:00:00Z")).record(new ModelReply("{}", 1, 1)); // no exception
    }

    @Test
    void theLimitsComeFromTheParameterFileAndMustBeAboveZero() {
        CoachLimits real = CoachLimits.fromClasspath();
        assertThat(real.monthlyBudgetUsd()).isPositive();
        assertThat(real.unpricedCallCostUsd()).isPositive();

        for (String bad : new String[] {"0", "-1", "'20'", "~"}) {
            String yaml = "parameters:\n  - key: coach_monthly_budget_usd\n    value: " + bad + "\n  - key: coach_unpriced_call_cost_usd\n    value: 0.01\n";
            assertThatIllegalStateException().as(bad).isThrownBy(() -> CoachLimits.fromYaml(new ByteArrayInputStream(yaml.getBytes(StandardCharsets.UTF_8))));
        }
        assertThatIllegalStateException().isThrownBy(() -> CoachLimits.fromYaml(new ByteArrayInputStream(
                "parameters:\n  - key: coach_monthly_budget_usd\n    value: 20\n".getBytes(StandardCharsets.UTF_8)))).withMessageContaining("coach_unpriced_call_cost_usd");
    }

    @Test
    void pricesAreBothSetOrNeitherAndNeverNegative() {
        assertThatIllegalStateException().isThrownBy(() -> new CoachProperties("fake", "A", "m", 400, new BigDecimal("0.1"), null, TYPES, 2000, 400));
        assertThatIllegalStateException().isThrownBy(() -> new CoachProperties("fake", "A", "m", 400, null, new BigDecimal("0.1"), TYPES, 2000, 400));
        assertThatIllegalStateException().isThrownBy(() -> unpriced().cost(new ModelReply("{}", 1, 1)));
    }
}
