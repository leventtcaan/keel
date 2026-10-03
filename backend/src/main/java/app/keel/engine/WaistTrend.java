package app.keel.engine;

import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.OptionalInt;

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
        LocalDate first = readings.stream().map(Reading::day).min(Comparator.naturalOrder()).orElseThrow();
        LocalDate last = readings.stream().map(Reading::day).max(Comparator.naturalOrder()).orElseThrow();
        if (!last.isAfter(first)) {
            return CheckIn.Waist.UNKNOWN;
        }
        BigDecimal change = mean(readings, last).subtract(mean(readings, first));
        BigDecimal error = BigDecimal.valueOf(parameters.number(ParameterKey.WAIST_MEASUREMENT_ERROR_CM));
        if (change.compareTo(error) > 0) {
            return CheckIn.Waist.UP;
        }
        return change.compareTo(error.negate()) < 0 ? CheckIn.Waist.DOWN : CheckIn.Waist.FLAT;
    }

    /** Days from the first reading to the last (K-603: were they weeks apart, H1 §1.5); none without a reading. */
    public static OptionalInt spanDays(List<Reading> readings) {
        Optional<LocalDate> first = readings.stream().map(Reading::day).min(Comparator.naturalOrder());
        Optional<LocalDate> last = readings.stream().map(Reading::day).max(Comparator.naturalOrder());
        return first.isEmpty() ? OptionalInt.empty() : OptionalInt.of((int) ChronoUnit.DAYS.between(first.get(), last.get()));
    }

    // A day measured twice counts as the mean of its readings: which came first is not known (the day has no time).
    private static BigDecimal mean(List<Reading> readings, LocalDate day) {
        List<BigDecimal> onDay = readings.stream().filter(reading -> reading.day().equals(day)).map(Reading::cm).toList();
        return onDay.stream().reduce(BigDecimal.ZERO, BigDecimal::add).divide(BigDecimal.valueOf(onDay.size()), MathContext.DECIMAL64);
    }
}
