package app.keel.engine;

import java.math.BigDecimal;
import java.util.Objects;

/** One parameter value: a number (kept exact, as written) or a yes/no switch. */
public sealed interface ParameterValue {

    /** Canonical text for versioning: 1 and 1.0 are the same value. */
    String canonical();

    record Decimal(BigDecimal value) implements ParameterValue {

        public Decimal {
            Objects.requireNonNull(value, "value");
        }

        @Override
        public String canonical() {
            return value.stripTrailingZeros().toPlainString();
        }
    }

    record Flag(boolean value) implements ParameterValue {

        @Override
        public String canonical() {
            return Boolean.toString(value);
        }
    }
}
