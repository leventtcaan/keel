package app.keel.engine;

import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Trend weight: the plain average of the weigh-ins in the {@code windowDays} days ending on {@code day}
 * (H1 §3.4: a 7-day moving average for display; the user understands it and it removes the weekly rhythm).
 * Missing days are skipped, not filled in, so a skipped morning never moves the trend.
 */
public final class WeightTrend {

    private WeightTrend() {
    }

    /** Empty when no weigh-in falls in the window: no data, no trend. */
    public static Optional<BigDecimal> at(WeightSeries series, LocalDate day, int windowDays) {
        if (windowDays < 1) {
            throw new IllegalArgumentException("A trend window is at least 1 day, was " + windowDays);
        }
        List<WeighIn> inWindow = series.between(day.minusDays(windowDays - 1L), day);
        if (inWindow.isEmpty()) {
            return Optional.empty();
        }
        BigDecimal sum = inWindow.stream().map(WeighIn::kg).reduce(BigDecimal.ZERO, BigDecimal::add);
        return Optional.of(sum.divide(BigDecimal.valueOf(inWindow.size()), MathContext.DECIMAL64));
    }
}
