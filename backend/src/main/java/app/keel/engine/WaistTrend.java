package app.keel.engine;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

/**
 * Where the waist went (K-213) over the readings given — the caller passes the decision window's: the last day measured
 * against the first. A change within the tape's own error (waist_measurement_error_cm, H1 §1.2) is flat; fewer than two
 * days measured is unknown, so the weekly spine asks instead of guessing (U3).
 */
public final class WaistTrend {

    public record Reading(LocalDate day, BigDecimal cm) {
    }

    private WaistTrend() {
    }

    public static CheckIn.Waist direction(List<Reading> readings, Parameters parameters) {
        if (readings.isEmpty()) {
            return CheckIn.Waist.UNKNOWN;
        }
        Reading first = readings.stream().min(Comparator.comparing(Reading::day)).orElseThrow();
        Reading last = readings.stream().max(Comparator.comparing(Reading::day)).orElseThrow();
        if (!last.day().isAfter(first.day())) {
            return CheckIn.Waist.UNKNOWN;
        }
        BigDecimal change = last.cm().subtract(first.cm());
        BigDecimal error = BigDecimal.valueOf(parameters.number(ParameterKey.WAIST_MEASUREMENT_ERROR_CM));
        if (change.compareTo(error) > 0) {
            return CheckIn.Waist.UP;
        }
        return change.compareTo(error.negate()) < 0 ? CheckIn.Waist.DOWN : CheckIn.Waist.FLAT;
    }
}
