package app.keel.engine;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/** RED stub (K-513). */
public final class FirstWeeks {

    public record Facts(LocalDate today, LocalDate began, int sessionsLastWeek, boolean trainingPlanned, boolean forgivenLastWeek,
            int loggedDaysLastWeek, int loggedDaysWeekBefore, boolean lastWeekPaused) {
    }

    public record Week(int number, Optional<CopyKey> content, List<Reason> risk) {
    }

    private FirstWeeks() {
    }

    public static Optional<Week> of(Facts facts, Parameters parameters) {
        return Optional.of(new Week(0, Optional.empty(), List.of()));
    }
}
