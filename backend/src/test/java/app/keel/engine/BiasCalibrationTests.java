package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.lang.reflect.ParameterizedType;
import java.lang.reflect.RecordComponent;
import java.lang.reflect.Type;
import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.Set;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.constraints.IntRange;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Logging bias (K-115, Ö-14). Photo and quick logs systematically under-count; an adaptive target built on them would
 * read "low expenditure" and aim wrong. The weight trend is the reference: per decision window, what was logged minus
 * the energy the weight change stands for is the expenditure in logged units; its gap to the reference maintenance is
 * that window's gap, smoothed across windows. The gap is the logs' bias plus the formula's own error, which cannot be told
 * apart: the bias is a range, gap ± that error (U5), claimed only when it excludes zero. A day without a log is absent,
 * not 0 kcal; decisions never read logs at all.
 */
class BiasCalibrationTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 25);
    private static final Parameters MALE = parameters(Sex.MALE);
    private static final int REFERENCE = 2800; // the maintenance estimate (Mifflin × activity) the caller passes
    private static final int WINDOW = MALE.wholeNumber(ParameterKey.DECISION_WINDOW_DAYS);
    private static final int KCAL_PER_KG = MALE.wholeNumber(ParameterKey.ENERGY_PER_KG_WEIGHT_CHANGE);
    private static final int SEEDS = 2000;

    // Hand-worked numbers below (redo them if a parameter changes on purpose):
    // - formula error: 15 % of 2800 = 420 kcal a day.
    // - one window's scale margin, daily weigh-ins: flat_margin_kg 0.58 × √((1/7 + 1/7) / (2/4)) = 0.4384 kg between
    //   the first and last weekly means, 14 days apart → × 7700 / 14 = 241.14 kcal a day.
    // - the newest window's weight, 21 days after the one before: 1 − 0.9^21 = 0.8906; three windows in a row weigh
    //   0.0120, 0.0974, 0.8906 → the scale margin of the smoothed gap √Σ(w·241.14)² = 216.06.
    // - so a steady gap g gives g ± (420 + 216.06) = g ± 636.06, and each window alone g ± 661.14.

    @Test
    void theLiteralNumbersBelowAssumeTodaysParameters() {
        assertThat(List.of(MALE.number(ParameterKey.MAINTENANCE_ESTIMATE_ERROR), MALE.number(ParameterKey.FLAT_MARGIN_KG),
                MALE.number(ParameterKey.LOGGING_BIAS_DAILY_SMOOTHING))).containsExactly(0.15, 0.58, 0.1);
        assertThat(List.of(WINDOW, KCAL_PER_KG, MALE.wholeNumber(ParameterKey.MIN_WEIGHINS_PER_WEEK),
                MALE.wholeNumber(ParameterKey.LOGGING_BIAS_MIN_WINDOWS))).containsExactly(21, 7700, 4, 2);
    }

    // ── a constant bias ─────────────────────────────────────────────────────────────────────────────────────

    @Test
    void aSteadyUnderCountIsLearnedFromAFlatWeightAsARange() {
        // Eats 2800 (weight flat), logs 1900: the logs imply 1900 of expenditure, the formula says 2800. The 900 gap is
        // the logs' bias plus the formula's own error plus the scale's noise, which cannot be told apart: 900 ± 636 (U5).
        User user = new User().windows(3, 2800, 900, 7);

        assertThat(estimate(user)).contains(new IntakeBias(264, 1536, 3));
    }

    @Test
    void theWeightTrendWinsOverTheLogs() {
        // Eats 2300 (a real 500 deficit: −0.065 kg a day), logs 1400. The logs alone say a 1400 deficit; the weight
        // says 500. The gap is 900 — measured by the scale, not taken from the logs.
        User user = new User().windows(3, 2300, 900, 7);

        assertThat(estimate(user)).hasValueSatisfying(bias -> {
            assertThat(bias.lowKcalPerDay()).isBetween(263, 265);
            assertThat(bias.highKcalPerDay()).isBetween(1535, 1537);
        });
    }

    // ── the formula's own error ─────────────────────────────────────────────────────────────────────────────

    @Test
    void aFormulaThatMissesIsNotMistakenForTheLogs() {
        // Really spends 3080 (10 % over the formula), eats 3080, logs exactly: the 280 gap is the formula's, not a bias.
        User user = new User().windows(3, 3080, 3080, 0, 7);

        assertThat(estimate(user)).isEmpty();
    }

    @Test
    void aFormulaThatMissesMovesTheRangeNotTheTruth() {
        // Really spends 3080, logs 1100 under: the gap to the formula is 820. Claiming 820 would be wrong by 280; the
        // range 820 ± 636 = 184-1456 holds the true 1100.
        User user = new User().windows(3, 3080, 3080, 1100, 7);

        assertThat(estimate(user)).contains(new IntakeBias(184, 1456, 3));
    }

    @Property
    boolean theTrueBiasIsInsideTheRangeWhereverTheFormulaErrs(@ForAll @IntRange(min = 2380, max = 3220) int expends,
            @ForAll @IntRange(min = -600, max = 600) int deficit, @ForAll @IntRange(min = -1500, max = 1500) int under) {
        // Noise-free and on any slope: anywhere inside the formula's typical ±15 %, a claimed range holds the true bias,
        // and a bias over the formula's error plus one window's range (420 + 661.14) is always claimed.
        Optional<IntakeBias> bias = estimate(new User().windows(3, expends, expends - deficit, under, 7));
        boolean holds = bias.map(range -> range.lowKcalPerDay() - 1 <= under && under <= range.highKcalPerDay() + 1).orElse(true);
        boolean claimedWhenLarge = Math.abs(under) <= 1083 || bias.isPresent();
        return holds && claimedWhenLarge;
    }

    // ── a noisy scale ───────────────────────────────────────────────────────────────────────────────────────

    @Test
    void onANoisyScaleAnHonestLoggerIsRarelyCalledBiasedEvenWhereTheFormulaMissesMost() {
        // Each morning ± a normal 0.42 kg of water (H1 §3.4). Formula 15 % under the truth (3220), logs exact: the gap
        // sits at −420, on the edge; only the scale's noise past its 95 % margin can make a claim — rare, one-sided.
        int claims = 0;
        for (long seed = 0; seed < SEEDS; seed++) {
            if (estimate(new User().noisy(new Random(seed)).windows(3, 3220, 3220, 0, 7)).isPresent()) {
                claims++;
            }
        }
        assertThat(claims).isLessThan(SEEDS / 20);
    }

    @Test
    void onANoisyScaleALargeBiasIsFoundAndTheRangeHoldsIt() {
        int found = 0;
        int held = 0;
        for (long seed = 0; seed < SEEDS; seed++) {
            Optional<IntakeBias> bias = estimate(new User().noisy(new Random(seed)).windows(3, 2800, 1100, 7));
            if (bias.isPresent()) {
                found++;
                held += bias.get().lowKcalPerDay() <= 1100 && 1100 <= bias.get().highKcalPerDay() ? 1 : 0;
            }
        }
        assertThat(found).isGreaterThan(SEEDS * 19 / 20);
        assertThat(held).isEqualTo(found);
    }

    // ── a changing bias ─────────────────────────────────────────────────────────────────────────────────────

    @Test
    void aChangingBiasIsFollowedNotFrozen() {
        // Two windows 1200 under, then two 900 under (the user got better at logging): 1200, 1200, 932.8, 903.6.
        // Four windows weigh 0.0013, 0.0107, 0.0974, 0.8906 → scale margin 216.05 → 903.6 ± 636.05.
        User user = new User().windows(2, 2800, 1200, 7).windows(2, 2800, 900, 7);

        assertThat(estimate(user)).contains(new IntakeBias(268, 1540, 4));
    }

    @Test
    void theLastTwoWindowsMustAgree() {
        // "Two windows" means the bias repeated: the newest two must each show it, on the same side.
        assertThat(estimate(new User().windows(1, 2800, -900, 7).windows(1, 2800, 900, 7))).isEmpty();
        assertThat(estimate(new User().windows(1, 2800, 0, 7).windows(1, 2800, 900, 7))).isEmpty();
        // The newest at 640 is past the formula's 420 but not past 420 + one window's scale margin 241.14 = 661.14,
        // although smoothed with 1200 before it (701.3 ± 636.4) the range would exclude zero.
        assertThat(estimate(new User().windows(1, 2800, 1200, 7).windows(1, 2800, 640, 7))).isEmpty();
    }

    // ── missing days ────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void aDayWithoutALogIsAbsentNotZero() {
        // Four logged days a week at 1900: the mean is 1900, not 4 × 1900 / 7.
        User user = new User().windows(3, 2800, 900, 4);

        assertThat(estimate(user)).contains(new IntakeBias(264, 1536, 3));
    }

    @Test
    void aWindowWithTooFewLoggedDaysIsNotUsed() {
        // Three logged days a week is under min_logged_days_per_week: no window is usable, no bias is claimed.
        User user = new User().windows(3, 2800, 900, 3);

        assertThat(estimate(user)).isEmpty();
    }

    @Test
    void anOldThinWindowIsSkippedAndTheGapItLeavesIsTimed() {
        // Windows 4 back (1500) and 2, 1 back (900) are good, 3 back is thin. The oldest is 42 days before the next, so
        // the next weighs 1 − 0.9^42 = 0.9880: 1500 → 907.18 → 900.79; weights 0.0013, 0.1081, 0.8906 → margin 216.33
        // → 900.79 ± 636.33. Timed as if adjacent (0.8906) it would be 907.18 ± 636.06 = 271-1543.
        User user = new User().windows(1, 2800, 1500, 7).windows(1, 2800, 900, 3).windows(2, 2800, 900, 7);

        assertThat(estimate(user)).contains(new IntakeBias(264, 1537, 3));
    }

    @Test
    void aThinNewestWindowMeansNoClaimToday() {
        // The bias is about how the user logs now; with the newest window unusable, nothing is claimed.
        User user = new User().windows(2, 2800, 900, 7).windows(1, 2800, 900, 3);

        assertThat(estimate(user)).isEmpty();
    }

    // ── when not to claim a bias ────────────────────────────────────────────────────────────────────────────

    @Test
    void oneWindowIsNotEnough() {
        User user = new User().windows(1, 2800, 900, 7);

        assertThat(estimate(user)).isEmpty();
    }

    @Test
    void aGapTheFormulaOrTheScaleCouldExplainIsNotCalledABias() {
        // 300 is inside the formula's 420; 600 is outside it but inside 420 + the scale's 216.
        assertThat(estimate(new User().windows(3, 2800, 300, 7))).isEmpty();
        assertThat(estimate(new User().windows(3, 2800, 600, 7))).isEmpty();
    }

    @Test
    void overLoggingIsABiasTooWithTheOtherSign() {
        User user = new User().windows(3, 2800, -900, 7);

        assertThat(estimate(user)).contains(new IntakeBias(-1536, -264, 3));
    }

    @Test
    void aBiasIsARangeThatExcludesZero() {
        assertThatIllegalArgumentException().isThrownBy(() -> new IntakeBias(-10, 500, 2));
        assertThatIllegalArgumentException().isThrownBy(() -> new IntakeBias(500, 180, 2));
        assertThatIllegalArgumentException().isThrownBy(() -> new IntakeBias(180, 1020, 0));
    }

    // ── decisions and words ─────────────────────────────────────────────────────────────────────────────────

    @Test
    void decisionsNeverReadLoggedFood() {
        // "The measured result beats the declaration": nothing reachable from the engine's decision input — the
        // Snapshot and every record inside it — has a place for logged intake or its bias.
        assertThat(logCarriers(Snapshot.class, new HashSet<>())).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"calibration.logs_run_low", "calibration.logs_run_high"})
    void theWordsAboutItNeverBlameNorClaimMoreThanWeKnow(String key) {
        // U7: a gap between logs and weight is how logging works, not a failing of the user. And no claim the research
        // does not carry: not "everyone", not "a little", not that numbers are already corrected — and the other reading
        // (our estimate of what they burn is off) is said too, since the two cannot be told apart.
        Map<String, Object> copy = EngineFixtures.copyGroup(new CopyKey(key));
        String text = (copy.get("title") + " " + copy.get("body")).toLowerCase();

        assertThat(copy).containsKeys("title", "body");
        assertThat(text).contains("our estimate");
        assertThat(Set.of("wrong", "lie", "cheat", "forgot", "fault", "should have", "didn't", "mistake", "careless", "honest",
                "everyone", "a little", "already")).noneMatch(text::contains);
    }

    private static List<String> logCarriers(Class<?> type, Set<Class<?>> seen) {
        List<String> found = new ArrayList<>();
        if (!type.isRecord() || !seen.add(type)) {
            return found;
        }
        for (RecordComponent component : type.getRecordComponents()) {
            List<Class<?>> types = new ArrayList<>(List.of(component.getType()));
            if (component.getGenericType() instanceof ParameterizedType generic) {
                for (Type argument : generic.getActualTypeArguments()) {
                    if (argument instanceof Class<?> c) {
                        types.add(c);
                    }
                }
            }
            if (types.contains(DailyIntake.class) || types.contains(IntakeBias.class)
                    || component.getName().toLowerCase(Locale.ROOT).contains("logged")) {
                found.add(type.getSimpleName() + "." + component.getName());
            }
            types.forEach(inner -> found.addAll(logCarriers(inner, seen)));
        }
        return found;
    }

    // ── a synthetic user ────────────────────────────────────────────────────────────────────────────────────

    private static Optional<IntakeBias> estimate(User user) {
        WeightSeries weights = user.weights(); // also writes the logs
        return IntakeCalibration.estimate(List.copyOf(user.logs), weights, REFERENCE, TODAY, MALE);
    }

    /**
     * A user who really spends {@code expends} (REFERENCE unless given), eats {@code eats} and logs {@code under} less,
     * on {@code loggedDays} days a week; the weight follows the energy balance, plus morning noise if asked.
     */
    private static final class User {
        final List<DailyIntake> logs = new ArrayList<>();
        private final List<int[]> plan = new ArrayList<>();
        private Random noise;

        User noisy(Random random) {
            noise = random;
            return this;
        }

        User windows(int count, int eats, int under, int loggedDays) {
            return windows(count, REFERENCE, eats, under, loggedDays);
        }

        User windows(int count, int expends, int eats, int under, int loggedDays) {
            for (int i = 0; i < count; i++) {
                plan.add(new int[] {expends, eats, under, loggedDays});
            }
            return this;
        }

        WeightSeries weights() {
            int days = plan.size() * WINDOW;
            LocalDate first = TODAY.minusDays(days - 1L);
            BigDecimal kg = new BigDecimal("80");
            List<WeighIn> weighIns = new ArrayList<>();
            logs.clear();
            for (int day = 0; day < days; day++) {
                int[] window = plan.get(day / WINDOW);
                LocalDate date = first.plusDays(day);
                BigDecimal water = noise == null ? BigDecimal.ZERO : BigDecimal.valueOf(noise.nextGaussian() * 0.42);
                weighIns.add(new WeighIn(date, kg.add(water)));
                if (day % 7 < window[3]) {
                    logs.add(new DailyIntake(date, window[1] - window[2]));
                }
                kg = kg.add(BigDecimal.valueOf(window[1] - window[0]).divide(BigDecimal.valueOf(KCAL_PER_KG), MathContext.DECIMAL64));
            }
            return new WeightSeries(weighIns);
        }
    }
}
