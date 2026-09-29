package app.keel.engine;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * A user's weigh-ins, ordered by date with at most one per day. Missing days are simply absent: nothing is filled
 * in, because an invented weigh-in is an invented number (U1).
 */
public record WeightSeries(List<WeighIn> weighIns) {

    public WeightSeries {
        Objects.requireNonNull(weighIns, "weighIns");
        weighIns = weighIns.stream().sorted(Comparator.comparing(WeighIn::date)).toList();
        for (int i = 1; i < weighIns.size(); i++) {
            if (weighIns.get(i).date().equals(weighIns.get(i - 1).date())) {
                throw new IllegalArgumentException("Two weigh-ins on " + weighIns.get(i).date() + "; keep one per day");
            }
        }
    }

    public Optional<LocalDate> firstDay() {
        return weighIns.isEmpty() ? Optional.empty() : Optional.of(weighIns.getFirst().date());
    }

    public Optional<LocalDate> lastDay() {
        return weighIns.isEmpty() ? Optional.empty() : Optional.of(weighIns.getLast().date());
    }

    /** Weigh-ins from {@code from} to {@code to}, both included. */
    public List<WeighIn> between(LocalDate from, LocalDate to) {
        return weighIns.stream().filter(w -> !w.date().isBefore(from) && !w.date().isAfter(to)).toList();
    }

    public int countBetween(LocalDate from, LocalDate to) {
        return between(from, to).size();
    }
}
