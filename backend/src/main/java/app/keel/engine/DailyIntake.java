package app.keel.engine;

import java.time.LocalDate;
import java.util.Objects;

/** One day's logged food, in kcal as logged (photo or text estimate). A day without a log is absent, never 0 kcal. */
public record DailyIntake(LocalDate date, int kcal) {

    public DailyIntake {
        Objects.requireNonNull(date, "date");
        if (kcal < 0) {
            throw new IllegalArgumentException("Logged kcal cannot be negative, was " + kcal);
        }
    }
}
