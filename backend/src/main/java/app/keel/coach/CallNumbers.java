package app.keel.coach;

import app.keel.decision.CallFacts;
import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * The numbers the coach may write about a call (K-505, U1): the action's own as they would be said (a calorie step
 * without its sign — the direction is the contradiction guards'; a fraction of the sets also as a percent). The day the
 * call is looked at again is said only as a date (ReplyCheck binds it), never as a bare number.
 */
final class CallNumbers {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private CallNumbers() {
    }

    static Set<BigDecimal> of(CallFacts call) {
        Set<BigDecimal> numbers = new HashSet<>();
        for (Map.Entry<String, Object> field : call.action().entrySet()) {
            if (field.getValue() instanceof Number number) {
                BigDecimal value = new BigDecimal(number.toString()).abs();
                numbers.add(plain(value));
                if (value.compareTo(BigDecimal.ONE) < 0 && value.signum() > 0) {
                    numbers.add(plain(value.multiply(HUNDRED)));
                }
            }
        }
        return Set.copyOf(numbers);
    }

    /** What the model is told it may write: the action's numbers, and the review day and year (as a date). */
    static Set<BigDecimal> told(CallFacts call) {
        Set<BigDecimal> told = new HashSet<>(of(call));
        told.add(BigDecimal.valueOf(call.nextReview().getDayOfMonth()));
        told.add(BigDecimal.valueOf(call.nextReview().getYear()));
        return Set.copyOf(told);
    }

    /** One way to write a value, so equal numbers are equal: 50, not 5E+1; 0.5, not 0.50. */
    static BigDecimal plain(BigDecimal value) {
        BigDecimal stripped = value.stripTrailingZeros();
        return stripped.scale() < 0 ? stripped.setScale(0) : stripped;
    }
}
