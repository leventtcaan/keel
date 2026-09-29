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

    // ── a constant bias ─────────────────────────────────────────────────────────────────────────────────────

    @Test
    void aSteadyUnderCountIsLearnedFromAFlatWeightAsARange() {
        // Eats 2800 (weight flat), logs 2200: the logs imply 2200 of expenditure, the formula says 2800. The 600 gap is
        // the logs' bias plus the formula's own error, ±15 % of 2800 = 420 (H6 A4) — which cannot be told apart, so the
        // bias is 600 ± 420 (U5).
        User user = new User().windows(3, 2800, 600, 7);

        assertThat(estimate(user)).contains(new IntakeBias(180, 1020, 3));
    }

    @Test
    void theWeightTrendWinsOverTheLogs() {
        // Eats 2300 (a real 500 deficit: −0.065 kg a day), logs 1700. The logs alone say a 1100 deficit; the weight
        // says 500. The bias is the difference: 600 — measured by the scale, not taken from the logs.
        User user = new User().windows(3, 2300, 600, 7);

        assertThat(estimate(user)).hasValueSatisfying(bias -> {
            assertThat(bias.lowKcalPerDay()).isBetween(179, 181);
            assertThat(bias.highKcalPerDay()).isBetween(1019, 1021);
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
        // Really spends 3080, logs 800 under: the gap to the formula is 520. Claiming 520 would be wrong by 280; the
        // range 100-940 holds the true 800.
        User user = new User().windows(3, 3080, 3080, 800, 7);

        assertThat(estimate(user)).contains(new IntakeBias(100, 940, 3));
    }

    @Property
    boolean theTrueBiasIsInsideTheRangeWhereverTheFormulaErrs(
            @ForAll @IntRange(min = 2380, max = 3220) int expends, @ForAll @IntRange(min = -1200, max = 1200) int under) {
        // Anywhere inside the formula's ±15 %: a claimed range holds the true bias, and a bias over twice the error is
        // always claimed (the gap is then over one error whatever the formula missed).
        Optional<IntakeBias> bias = estimate(new User().windows(3, expends, expends, under, 7));
        int error = 420;
        boolean holds = bias.map(range -> range.lowKcalPerDay() - 1 <= under && under <= range.highKcalPerDay() + 1).orElse(true);
        boolean claimedWhenLarge = Math.abs(under) <= 2 * error + 1 || bias.isPresent();
        return holds && claimedWhenLarge;
    }

    // ── a changing bias ─────────────────────────────────────────────────────────────────────────────────────

    @Test
    void aChangingBiasIsFollowedNotFrozen() {
        // Two windows 800 under, then two 500 under (the user got better at logging). The daily smoothing of H1 §3.4
        // (α 0.1) over a 21-day window weighs the newest window 1 − 0.9^21 ≈ 0.891: 800, 800, 532.8, 503.6 → ± 420.
        User user = new User().windows(2, 2800, 800, 7).windows(2, 2800, 500, 7);

        assertThat(estimate(user)).contains(new IntakeBias(84, 924, 4));
    }

    // ── missing days and noise ──────────────────────────────────────────────────────────────────────────────

    @Test
    void aDayWithoutALogIsAbsentNotZero() {
        // Four logged days a week at 2200: the mean is 2200, not 4 × 2200 / 7.
        User user = new User().windows(3, 2800, 600, 4);

        assertThat(estimate(user)).contains(new IntakeBias(180, 1020, 3));
    }

    @Test
    void aWindowWithTooFewLoggedDaysIsNotUsed() {
        // Three logged days a week is under min_logged_days_per_week: no window is usable, no bias is claimed.
        User user = new User().windows(3, 2800, 600, 3);

        assertThat(estimate(user)).isEmpty();
    }

    @Test
    void oneThinWindowBetweenGoodOnesIsSkippedNotCounted() {
        User user = new User().windows(1, 2800, 600, 7).windows(1, 2800, 600, 3).windows(2, 2800, 600, 7);

        assertThat(estimate(user)).contains(new IntakeBias(180, 1020, 3));
    }

    @Test
    void aNoisyScaleStillPutsTheTrueBiasInsideTheRange() {
        // Each morning ± a normal 0.42 kg of water (H1 §3.4). Two weekly means 14 days apart then differ by ~0.22 kg of
        // noise, ~120 kcal a day — well inside the 420 of the formula's error.
        User user = new User().noisy(new Random(42)).windows(3, 2800, 600, 7);

        assertThat(estimate(user)).hasValueSatisfying(bias ->
                assertThat(600).isBetween(bias.lowKcalPerDay(), bias.highKcalPerDay()));
    }

    // ── when not to claim a bias ────────────────────────────────────────────────────────────────────────────

    @Test
    void oneWindowIsNotEnough() {
        User user = new User().windows(1, 2800, 600, 7);

        assertThat(estimate(user)).isEmpty();
    }

    @Test
    void aGapInsideTheFormulasOwnErrorIsNotCalledABias() {
        // ±15 % of 2800 = 420: a 300 gap could be the formula missing, not the logs (H6 A4).
        User user = new User().windows(3, 2800, 300, 7);

        assertThat(estimate(user)).isEmpty();
    }

    @Test
    void overLoggingIsABiasTooWithTheOtherSign() {
        User user = new User().windows(3, 2800, -600, 7);

        assertThat(estimate(user)).contains(new IntakeBias(-1020, -180, 3));
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
        // does not carry: not "everyone", not "a little", not that numbers are already corrected.
        Map<String, Object> copy = EngineFixtures.copyGroup(new CopyKey(key));
        String text = (copy.get("title") + " " + copy.get("body")).toLowerCase();

        assertThat(copy).containsKeys("title", "body");
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
