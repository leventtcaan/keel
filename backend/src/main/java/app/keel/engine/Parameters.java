package app.keel.engine;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Objects;

/**
 * The parameter set resolved for one user's sex: what a rule reads. Obtained from {@link ParameterSet#forSex(Sex)};
 * every key is present because the set was checked when it was loaded.
 */
public final class Parameters {

    private final Sex sex;
    private final Map<ParameterKey, ParameterValue> values;

    Parameters(Sex sex, Map<ParameterKey, ParameterValue> values) {
        this.sex = Objects.requireNonNull(sex, "sex");
        this.values = Map.copyOf(values);
    }

    public Sex sex() {
        return sex;
    }

    public double number(ParameterKey key) {
        return decimal(key).doubleValue();
    }

    /** For counts and day windows; fails if the file holds a fraction, instead of silently rounding it. */
    public int wholeNumber(ParameterKey key) {
        BigDecimal decimal = decimal(key).stripTrailingZeros();
        if (decimal.scale() > 0) {
            throw new IllegalStateException(key.yamlKey() + " is " + decimal.toPlainString() + ", not a whole number");
        }
        return decimal.intValueExact();
    }

    public boolean flag(ParameterKey key) {
        if (value(key) instanceof ParameterValue.Flag(boolean on)) {
            return on;
        }
        throw new IllegalStateException(key.yamlKey() + " is a number, not a flag");
    }

    private BigDecimal decimal(ParameterKey key) {
        if (value(key) instanceof ParameterValue.Decimal(BigDecimal decimal)) {
            return decimal;
        }
        throw new IllegalStateException(key.yamlKey() + " is a flag, not a number");
    }

    private ParameterValue value(ParameterKey key) {
        ParameterValue value = values.get(Objects.requireNonNull(key, "key"));
        if (value == null) {
            throw new IllegalStateException(key.yamlKey() + " is not loaded");
        }
        return value;
    }
}
