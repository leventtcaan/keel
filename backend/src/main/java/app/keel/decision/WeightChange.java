package app.keel.decision;

import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import app.keel.engine.WeightSeries;
import app.keel.engine.WeightTrend;
import app.keel.shared.Decimals;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Optional;

/**
 * The period's weight change (K-988, ADR-078 #2, Ek 1), pure: today's trend weight (the trend_display_days average ending
 * today) minus the one ending on {@code since}, the day the record began. Never one day's weigh-in (U8): each window needs
 * min_weighins_per_week weigh-ins, the rule DataSufficiency holds a week to, and the two do not share a day. Rounded as a
 * trend point is.
 */
final class WeightChange {

    /** As /v1/weight-trend sends a trend point. */
    private static final int DECIMALS = 2;

    private WeightChange() {
    }

    /** Below zero a loss; empty when either window is too thin, or they overlap. */
    static Optional<BigDecimal> of(WeightSeries weights, LocalDate since, LocalDate today, Parameters parameters) {
        int window = parameters.wholeNumber(ParameterKey.TREND_DISPLAY_DAYS);
        int enough = parameters.wholeNumber(ParameterKey.MIN_WEIGHINS_PER_WEEK);
        if (today.isBefore(since.plusDays(window)) || !enough(weights, since, window, enough) || !enough(weights, today, window, enough)) {
            return Optional.empty();
        }
        return WeightTrend.at(weights, today, window).flatMap(now -> WeightTrend.at(weights, since, window).map(then -> now.subtract(then)))
                .map(kg -> Decimals.plain(kg.setScale(DECIMALS, RoundingMode.HALF_UP)));
    }

    private static boolean enough(WeightSeries weights, LocalDate until, int window, int enough) {
        return weights.countBetween(until.minusDays(window - 1L), until) >= enough;
    }
}
