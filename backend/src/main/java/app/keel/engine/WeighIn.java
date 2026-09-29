package app.keel.engine;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;

/** One morning's weight. Kept exact as entered; the trend, not a single day, is what gets interpreted (U8). */
public record WeighIn(LocalDate date, BigDecimal kg) {

    public WeighIn {
        Objects.requireNonNull(date, "date");
        Objects.requireNonNull(kg, "kg");
        if (kg.signum() <= 0) {
            throw new IllegalArgumentException("A weigh-in must be above 0 kg, was " + kg + " on " + date);
        }
    }
}
