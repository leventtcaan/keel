package app.keel.coach;

import app.keel.decision.CallFacts;
import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Every number the coach may write about a call (K-505, U1): the action's own numbers as they would be said (a calorie
 * step without its sign; a fraction of the sets also as a percent) and the day it is looked at again. Nothing else — a
 * number the engine did not make is not the coach's to say.
 */
final class CallNumbers {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private CallNumbers() {
    }

    static Set<BigDecimal> of(CallFacts call) {
        Set<BigDecimal> numbers = new HashSet<>();
        for (Map.Entry<String, Object> field : call.action().entrySet()) {
            if (field.getValue() instanceof Number number) {
                BigDecimal value = new BigDecimal(number.toString()).abs().stripTrailingZeros();
                numbers.add(value);
                if (value.compareTo(BigDecimal.ONE) < 0 && value.signum() > 0) {
                    numbers.add(value.multiply(HUNDRED).stripTrailingZeros());
                }
            }
        }
        numbers.add(BigDecimal.valueOf(call.nextReview().getDayOfMonth()));
        numbers.add(BigDecimal.valueOf(call.nextReview().getYear()));
        return Set.copyOf(numbers.stream().map(CallNumbers::plain).toList());
    }

    /** One way to write a value, so equal numbers are equal: 50, not 5E+1; 0.5, not 0.50. */
    static BigDecimal plain(BigDecimal value) {
        BigDecimal stripped = value.stripTrailingZeros();
        return stripped.scale() < 0 ? stripped.setScale(0) : stripped;
    }
}
