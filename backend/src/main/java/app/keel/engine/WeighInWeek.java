package app.keel.engine;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * This check-in week's weigh-ins against what the call that ends it needs (ADR-089 #1): the block is the engine's own — the
 * seven days ending on the day of the call, as {@link DataSufficiency} counts the week that comes first — and it needs
 * {@code min_weighins_per_week} of them. A block that cannot reach that any more (the days weighed plus the mornings left from
 * today on, today's included while it is not weighed) holds the call back: then {@code callsFrom} is the first day from which
 * the data stays enough if the user weighs in every morning from tomorrow, the one {@link DataSufficiency} promises as the
 * call's review date. The same function, so the date the card names and the date the call names cannot differ.
 *
 * @param from the block's first day, six days before {@code to}
 * @param to the day of the call, the block's last
 * @param weighedDays the days of the block with a weigh-in, oldest first; never a day after today
 * @param needed the weigh-ins a block needs ({@code min_weighins_per_week})
 * @param callsFrom present only when the block cannot reach {@code needed}
 */
public record WeighInWeek(LocalDate from, LocalDate to, List<LocalDate> weighedDays, int needed, Optional<LocalDate> callsFrom) {

    private static final int DAYS_PER_WEEK = 7;

    public WeighInWeek {
        Objects.requireNonNull(from, "from");
        Objects.requireNonNull(to, "to");
        Objects.requireNonNull(weighedDays, "weighedDays");
        Objects.requireNonNull(callsFrom, "callsFrom");
        weighedDays = List.copyOf(weighedDays);
    }

    /**
     * The block that ends on {@code checkIn}, read on {@code today}.
     *
     * @param today the user's day; time is an input, the engine reads no clock (ADR-003)
     * @param checkIn the day of the next call: today or later
     * @param planStart the day the plan's decision window counts from; the day of the first call when there is no plan yet
     * @param weights the weigh-ins the engine reads (one a day, none imported), up to today
     */
    public static WeighInWeek of(LocalDate today, LocalDate checkIn, LocalDate planStart, WeightSeries weights, Parameters parameters) {
        Objects.requireNonNull(today, "today");
        Objects.requireNonNull(checkIn, "checkIn");
        Objects.requireNonNull(planStart, "planStart");
        Objects.requireNonNull(weights, "weights");
        if (checkIn.isBefore(today)) {
            throw new IllegalArgumentException("The call's day " + checkIn + " is before today " + today);
        }
        weights.lastDay().filter(last -> last.isAfter(today)).ifPresent(last -> {
            throw new IllegalArgumentException("A weigh-in on " + last + " is after today " + today);
        });
        LocalDate from = checkIn.minusDays(DAYS_PER_WEEK - 1L);
        List<LocalDate> weighed = weights.between(from, checkIn).stream().map(WeighIn::date).toList();
        // The mornings left: today on (the whole block, if it has not begun), the ones without a weigh-in.
        LocalDate firstLeft = today.isAfter(from) ? today : from;
        long left = firstLeft.datesUntil(checkIn.plusDays(1)).filter(day -> !weighed.contains(day)).count();
        int needed = parameters.wholeNumber(ParameterKey.MIN_WEIGHINS_PER_WEEK);
        Optional<LocalDate> callsFrom = weighed.size() + left < needed
                ? Optional.of(DataSufficiency.earliestEnoughDay(today, planStart, weights, parameters))
                : Optional.empty();
        return new WeighInWeek(from, checkIn, weighed, needed, callsFrom);
    }
}
