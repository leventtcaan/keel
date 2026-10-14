package app.keel.measurement;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;

/**
 * What the weigh screen and the progress screen's weight section read (K-1018, ADR-078 Ek 2): the newest weigh-in, how
 * many days have one and whether that has reached trend_min_weighins, so the phone shows the trend without counting.
 * The days are the weight trend's days (user's local day, the day's first, imported history too: ADR-053), taken by the
 * same rule, over all time. The gate is the weight trend's display only: no decision rule reads it.
 *
 * @param last the newest weigh-in whatever its source; none until there is one
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
record WeightSummary(MeasurementStore.WeighIn last, int weighInCount, int trendMinWeighIns, boolean trendReady) {

    /** The summary of {@code weighIns} (any order) in the user's {@code zone}, for a trend that needs {@code trendMinWeighIns} days. */
    static WeightSummary of(List<MeasurementStore.WeighIn> weighIns, ZoneId zone, int trendMinWeighIns) {
        List<MeasurementStore.WeighIn> oldestFirst = weighIns.stream().sorted(Comparator.comparing(MeasurementStore.WeighIn::measuredAt)).toList();
        int days = Measurements.firstOfEachDay(oldestFirst, zone).size();
        MeasurementStore.WeighIn last = oldestFirst.isEmpty() ? null : oldestFirst.getLast();
        return new WeightSummary(last, days, trendMinWeighIns, days >= trendMinWeighIns);
    }
}
