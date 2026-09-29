package app.keel.engine;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Learns how far a user's logs run from what their weight shows (K-115, Ö-14). Photo and quick logs can under-count
 * systematically; an adaptive target built on them would read "low expenditure" and aim wrong. Here the weight trend is
 * the reference and the logs are what gets corrected — never the other way round. The engine's decisions do not read
 * logged food at all (no Snapshot field carries it); this estimate is for what the app shows and for logged adherence.
 *
 * <p>Per decision window (21/28 days, back from today): expenditure in logged units = mean logged kcal − (weight change
 * between the first and the last week × energy_per_kg_weight_change ÷ days between them). Its gap to the reference —
 * the formula's maintenance, Mifflin-St Jeor × activity (K-114) — is that window's gap. It holds three things that
 * cannot be told apart: the logs' bias, the formula's own error (maintenance_estimate_error, a typical spread, H6 A4)
 * and the scale's noise on the two weekly means (the 95 % margin of L-10, scaled to the weigh-ins). So the bias is a
 * range, gap ± both errors, and it is claimed only when (1) the newest logging_bias_min_windows windows each show it
 * alone, beyond both errors, on the same side — the bias repeated — and (2) the smoothed range excludes zero. Windows
 * are smoothed with the weight trend's daily EWMA factor carried over the days between them (H1 §3.4). A day without
 * a log is absent, never 0 kcal.
 */
public final class IntakeCalibration {

    private static final int DAYS_PER_WEEK = 7;

    private IntakeCalibration() {
    }

    /**
     * @param referenceKcal the maintenance the formula expects today (InitialTarget.estimate)
     * @return the bias range in kcal a day (positive: logs run under), or empty when the formula's error and the scale's
     *     noise could explain the gap, or the newest windows do not show it the same way
     */
    public static Optional<IntakeBias> estimate(List<DailyIntake> logged, WeightSeries weights, int referenceKcal, LocalDate today,
            Parameters parameters) {
        int window = parameters.wholeNumber(ParameterKey.DECISION_WINDOW_DAYS);
        BigDecimal formulaError = BigDecimal.valueOf(referenceKcal)
                .multiply(BigDecimal.valueOf(parameters.number(ParameterKey.MAINTENANCE_ESTIMATE_ERROR)));
        List<Optional<Gap>> windows = new ArrayList<>(); // newest first; empty where a window is not usable
        Optional<LocalDate> firstWeighIn = weights.firstDay();
        for (LocalDate end = today; firstWeighIn.isPresent() && !end.minusDays(window - 1L).isBefore(firstWeighIn.get());
                end = end.minusDays(window)) {
            windows.add(windowGap(logged, weights, referenceKcal, end, parameters));
        }
        // "Repeated": the newest min_windows windows each show the bias alone, beyond both errors, on the same side.
        int minWindows = parameters.wholeNumber(ParameterKey.LOGGING_BIAS_MIN_WINDOWS);
        if (windows.size() < minWindows) {
            return Optional.empty();
        }
        List<Integer> sides = windows.subList(0, minWindows).stream()
                .map(gap -> gap.map(g -> g.side(formulaError)).orElse(0)).distinct().toList();
        if (sides.size() != 1 || sides.getFirst() == 0) {
            return Optional.empty();
        }

        // Smoothed oldest to newest; a newer window weighs 1 − (1 − α)^days since the one before it, so a skipped window
        // leaves more time, not a smaller step. The weights are kept to carry each window's scale margin through.
        List<Gap> used = windows.reversed().stream().flatMap(Optional::stream).toList();
        BigDecimal keep = BigDecimal.ONE.subtract(BigDecimal.valueOf(parameters.number(ParameterKey.LOGGING_BIAS_DAILY_SMOOTHING)));
        BigDecimal smoothed = used.getFirst().kcal();
        List<BigDecimal> weightsOfWindows = new ArrayList<>(List.of(BigDecimal.ONE));
        for (int i = 1; i < used.size(); i++) {
            int days = (int) ChronoUnit.DAYS.between(used.get(i - 1).end(), used.get(i).end());
            BigDecimal alpha = BigDecimal.ONE.subtract(keep.pow(days, MathContext.DECIMAL64));
            smoothed = alpha.multiply(used.get(i).kcal()).add(BigDecimal.ONE.subtract(alpha).multiply(smoothed));
            weightsOfWindows.replaceAll(w -> w.multiply(BigDecimal.ONE.subtract(alpha)));
            weightsOfWindows.add(alpha);
        }
        // Independent 95 % margins combine as the root of the sum of their weighted squares.
        BigDecimal squares = BigDecimal.ZERO;
        for (int i = 0; i < used.size(); i++) {
            BigDecimal part = weightsOfWindows.get(i).multiply(used.get(i).scaleMargin());
            squares = squares.add(part.multiply(part));
        }
        BigDecimal halfWidth = formulaError.add(squares.sqrt(MathContext.DECIMAL64));
        int low = whole(smoothed.subtract(halfWidth));
        int high = whole(smoothed.add(halfWidth));
        if (low <= 0 && high >= 0) {
            return Optional.empty(); // the range holds zero: the formula's error and the scale could explain the gap
        }
        return Optional.of(new IntakeBias(low, high, used.size()));
    }

    /** One window's gap to the reference and the 95 % margin the scale puts on it, both in kcal a day. */
    private record Gap(LocalDate end, BigDecimal kcal, BigDecimal scaleMargin) {

        /** 1 or −1 when this window alone shows a bias beyond both errors, 0 when it does not. */
        int side(BigDecimal formulaError) {
            return kcal.abs().compareTo(formulaError.add(scaleMargin)) > 0 ? kcal.signum() : 0;
        }
    }

    /** One window's gap; empty when a week of it has too few weigh-ins or too few logged days. */
    private static Optional<Gap> windowGap(List<DailyIntake> logged, WeightSeries weights, int referenceKcal, LocalDate end,
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
        List<WeighIn> firstWeek = weights.between(start, start.plusDays(DAYS_PER_WEEK - 1L));
        List<WeighIn> lastWeek = weights.between(end.minusDays(DAYS_PER_WEEK - 1L), end);
        BigDecimal kcalPerKgPerDay = BigDecimal.valueOf(parameters.wholeNumber(ParameterKey.ENERGY_PER_KG_WEIGHT_CHANGE))
                .divide(BigDecimal.valueOf(window - DAYS_PER_WEEK), MathContext.DECIMAL64);
        BigDecimal stored = mean(lastWeek).subtract(mean(firstWeek)).multiply(kcalPerKgPerDay);
        BigDecimal expenditureInLoggedUnits = meanLogged.subtract(stored);
        return Optional.of(new Gap(end, BigDecimal.valueOf(referenceKcal).subtract(expenditureInLoggedUnits),
                scaleMarginKg(firstWeek.size(), lastWeek.size(), parameters).multiply(kcalPerKgPerDay)));
    }

    /**
     * The 95 % margin on the difference of two weekly means: flat_margin_kg is that margin for min_weighins_per_week
     * weigh-ins in each week (L-10: 1.96 × 0.42 × √(2/4)); it scales with √(1/n₁ + 1/n₂).
     */
    private static BigDecimal scaleMarginKg(int first, int last, Parameters parameters) {
        BigDecimal minimum = BigDecimal.valueOf(parameters.wholeNumber(ParameterKey.MIN_WEIGHINS_PER_WEEK));
        BigDecimal these = BigDecimal.ONE.divide(BigDecimal.valueOf(first), MathContext.DECIMAL64)
                .add(BigDecimal.ONE.divide(BigDecimal.valueOf(last), MathContext.DECIMAL64));
        BigDecimal atMinimum = BigDecimal.TWO.divide(minimum, MathContext.DECIMAL64);
        return BigDecimal.valueOf(parameters.number(ParameterKey.FLAT_MARGIN_KG))
                .multiply(these.divide(atMinimum, MathContext.DECIMAL64).sqrt(MathContext.DECIMAL64));
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
