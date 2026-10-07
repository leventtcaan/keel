package app.keel.engine;

import java.time.DayOfWeek;
import java.util.Objects;

/** One cardio session of the week: the weekday and where in that day it sits. */
public record CardioSession(DayOfWeek day, CardioPlacement placement) {

    public CardioSession {
        Objects.requireNonNull(day, "day");
        Objects.requireNonNull(placement, "placement");
    }
}
