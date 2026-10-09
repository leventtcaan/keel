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
 * min_weighins_per_week weigh-ins, the rule DataSufficiency holds a week to, scaled to the window, and the two do not
 * share a day. Steady within the engine's flat_margin_kg, as a call reads a flat week. Rounded as a trend point is.
 */
final class WeightChange {

    /** The way the weight went: STEADY while the change does not pass flat_margin_kg. */
    enum Direction { DOWN, UP, STEADY }

    /** The change in kg (below zero a loss) and its direction. */
    record Change(BigDecimal kg, Direction direction) {
    }

    /** As /v1/weight-trend sends a trend point. */
    private static final int DECIMALS = 2;
    private static final int DAYS_PER_WEEK = 7;

    private WeightChange() {
    }

    /** Empty when either window is too thin, or they overlap. */
    static Optional<Change> of(WeightSeries weights, LocalDate since, LocalDate today, Parameters parameters) {
        int window = parameters.wholeNumber(ParameterKey.TREND_DISPLAY_DAYS);
        int enough = needed(parameters.wholeNumber(ParameterKey.MIN_WEIGHINS_PER_WEEK), window);
        if (today.isBefore(since.plusDays(window)) || !enough(weights, since, window, enough) || !enough(weights, today, window, enough)) {
            return Optional.empty();
        }
        BigDecimal margin = BigDecimal.valueOf(parameters.number(ParameterKey.FLAT_MARGIN_KG));
        return WeightTrend.at(weights, today, window).flatMap(now -> WeightTrend.at(weights, since, window).map(then -> now.subtract(then)))
                .map(kg -> new Change(Decimals.plain(kg.setScale(DECIMALS, RoundingMode.HALF_UP)), direction(kg, margin)));
    }

    /** The direction of {@code kg} against the user's flat_margin_kg (repository parameters, as the tests read them). */
    static Direction direction(BigDecimal kg, BigDecimal margin) {
        // The margin must be passed, as WeeklySpine reads a flat window.
        return kg.compareTo(margin) > 0 ? Direction.UP : kg.negate().compareTo(margin) > 0 ? Direction.DOWN : Direction.STEADY;
    }

    /** A week's minimum over a window of {@code windowDays}: its share, rounded up (the same number for a seven-day window). */
    static int needed(int perWeek, int windowDays) {
        return Math.ceilDiv(perWeek * windowDays, DAYS_PER_WEEK);
    }

    private static boolean enough(WeightSeries weights, LocalDate until, int window, int enough) {
        return weights.countBetween(until.minusDays(window - 1L), until) >= enough;
    }
}
