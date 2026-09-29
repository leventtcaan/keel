package app.keel.engine;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Learns how far a user's logs run from what their weight shows (K-115, Ö-14). Photo and quick logs can under-count
 * systematically; an adaptive target built on them would read "low expenditure" and aim wrong. Here the weight trend is
 * the reference and the logs are what gets corrected — never the other way round. The engine's decisions do not read
 * logged food at all (no Snapshot field carries it); this estimate is for what the app shows and for logged adherence.
 *
 * <p>Per decision window (21/28 days, oldest first): expenditure in logged units = mean logged kcal − (weight change
 * between the first and the last week × energy_per_kg_weight_change ÷ days between them). Its gap to the reference —
 * the formula's maintenance, Mifflin-St Jeor × activity (K-114) — is that window's gap. The windows are smoothed with
 * the weight trend's daily EWMA factor carried over a whole window (H1 §3.4). The gap is the logs' bias plus the
 * formula's own error (maintenance_estimate_error, H6 A4), and the two cannot be told apart: the bias is the gap ± that
 * error, claimed only when the range excludes zero and only after logging_bias_min_windows usable windows. A day
 * without a log is absent, never 0 kcal.
 */
public final class IntakeCalibration {

    private static final int DAYS_PER_WEEK = 7;

    private IntakeCalibration() {
    }

    /**
     * @param referenceKcal the maintenance the formula expects today (InitialTarget.estimate)
     * @return the bias range in kcal a day (positive: logs run under), or empty when the formula's error could explain it
     */
    public static Optional<IntakeBias> estimate(List<DailyIntake> logged, WeightSeries weights, int referenceKcal, LocalDate today,
            Parameters parameters) {
        int window = parameters.wholeNumber(ParameterKey.DECISION_WINDOW_DAYS);
        List<BigDecimal> gaps = new ArrayList<>(); // per-window gaps, newest first while collecting
        Optional<LocalDate> firstWeighIn = weights.firstDay();
        for (LocalDate end = today; firstWeighIn.isPresent() && !end.minusDays(window - 1L).isBefore(firstWeighIn.get());
                end = end.minusDays(window)) {
            windowGap(logged, weights, referenceKcal, end, parameters).ifPresent(gaps::add);
        }
        if (gaps.size() < parameters.wholeNumber(ParameterKey.LOGGING_BIAS_MIN_WINDOWS)) {
            return Optional.empty();
        }
        // The newest window's weight: what a daily factor leaves of the old estimate after a whole window, 1 − (1 − α)^days.
        BigDecimal daily = BigDecimal.valueOf(parameters.number(ParameterKey.LOGGING_BIAS_DAILY_SMOOTHING));
        BigDecimal alpha = BigDecimal.ONE.subtract(BigDecimal.ONE.subtract(daily).pow(window, MathContext.DECIMAL64));
        BigDecimal smoothed = gaps.getLast();
        for (int i = gaps.size() - 2; i >= 0; i--) {
            smoothed = alpha.multiply(gaps.get(i)).add(BigDecimal.ONE.subtract(alpha).multiply(smoothed));
        }
        BigDecimal formulaError = BigDecimal.valueOf(referenceKcal)
                .multiply(BigDecimal.valueOf(parameters.number(ParameterKey.MAINTENANCE_ESTIMATE_ERROR)));
        int low = whole(smoothed.subtract(formulaError));
        int high = whole(smoothed.add(formulaError));
        if (low <= 0 && high >= 0) {
            return Optional.empty(); // the range holds zero: the formula's error alone could explain the gap
        }
        return Optional.of(new IntakeBias(low, high, gaps.size()));
    }

    /** One window's gap to the reference; empty when a week of it has too few weigh-ins or too few logged days. */
    private static Optional<BigDecimal> windowGap(List<DailyIntake> logged, WeightSeries weights, int referenceKcal, LocalDate end,
            Parameters parameters) {
        int window = parameters.wholeNumber(ParameterKey.DECISION_WINDOW_DAYS);
        LocalDate start = end.minusDays(window - 1L);
        int minWeighIns = parameters.wholeNumber(ParameterKey.MIN_WEIGHINS_PER_WEEK);
        int minLogged = parameters.wholeNumber(ParameterKey.MIN_LOGGED_DAYS_PER_WEEK);
        for (LocalDate weekStart = start; weekStart.isBefore(end); weekStart = weekStart.plusDays(DAYS_PER_WEEK)) {
            LocalDate weekEnd = weekStart.plusDays(DAYS_PER_WEEK - 1L);
            if (weights.countBetween(weekStart, weekEnd) < minWeighIns || loggedBetween(logged, weekStart, weekEnd).size() < minLogged) {
                return Optional.empty();
            }
        }
        List<DailyIntake> inWindow = loggedBetween(logged, start, end);
        BigDecimal meanLogged = BigDecimal.valueOf(inWindow.stream().mapToLong(DailyIntake::kcal).sum())
                .divide(BigDecimal.valueOf(inWindow.size()), MathContext.DECIMAL64);
        BigDecimal change = mean(weights.between(end.minusDays(DAYS_PER_WEEK - 1L), end))
                .subtract(mean(weights.between(start, start.plusDays(DAYS_PER_WEEK - 1L))));
        BigDecimal stored = change.multiply(BigDecimal.valueOf(parameters.wholeNumber(ParameterKey.ENERGY_PER_KG_WEIGHT_CHANGE)))
                .divide(BigDecimal.valueOf(window - DAYS_PER_WEEK), MathContext.DECIMAL64);
        BigDecimal expenditureInLoggedUnits = meanLogged.subtract(stored);
        return Optional.of(BigDecimal.valueOf(referenceKcal).subtract(expenditureInLoggedUnits));
    }

    private static int whole(BigDecimal kcal) {
        return kcal.setScale(0, RoundingMode.HALF_UP).intValueExact();
    }

    private static List<DailyIntake> loggedBetween(List<DailyIntake> logged, LocalDate from, LocalDate to) {
        return logged.stream().filter(day -> !day.date().isBefore(from) && !day.date().isAfter(to)).toList();
    }

    private static BigDecimal mean(List<WeighIn> weighIns) {
        BigDecimal sum = weighIns.stream().map(WeighIn::kg).reduce(BigDecimal.ZERO, BigDecimal::add);
        return sum.divide(BigDecimal.valueOf(weighIns.size()), MathContext.DECIMAL64);
    }
}
