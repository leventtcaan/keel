package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.ParameterizedType;
import java.lang.reflect.RecordComponent;
import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

/**
 * Logging bias (K-115, Ö-14). Photo and quick logs systematically under-count; an adaptive target built on them would
 * read "low expenditure" and aim wrong. The weight trend is the reference: per decision window, what was logged minus
 * the energy the weight change stands for is the expenditure in logged units; its gap to the reference maintenance is
 * that window's bias, smoothed across windows. Within the formula's own error no bias is claimed; a day without a log
 * is absent, not 0 kcal; decisions never read logs at all.
 */
class BiasCalibrationTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 25);
    private static final Parameters MALE = parameters(Sex.MALE);
    private static final int REFERENCE = 2800; // the maintenance estimate (Mifflin × activity) the caller passes
    private static final int WINDOW = MALE.wholeNumber(ParameterKey.DECISION_WINDOW_DAYS);
    private static final int KCAL_PER_KG = MALE.wholeNumber(ParameterKey.ENERGY_PER_KG_WEIGHT_CHANGE);

    // ── a constant bias ─────────────────────────────────────────────────────────────────────────────────────

    @Test
    void aSteadyUnderCountIsLearnedFromAFlatWeight() {
        // Eats 2800 (weight flat), logs 2200: 600 a day under, window after window.
        User user = new User().windows(3, 2800, 600, 7);

        assertThat(estimate(user)).contains(new IntakeBias(600, 3));
    }

    @Test
    void theWeightTrendWinsOverTheLogs() {
        // Eats 2300 (a real 500 deficit: −0.065 kg a day), logs 1700. The logs alone say a 1100 deficit; the weight
        // says 500. The bias is the difference: 600 — measured by the scale, not taken from the logs.
        User user = new User().windows(3, 2300, 600, 7);

        assertThat(estimate(user))
                .hasValueSatisfying(bias -> assertThat(bias.kcalPerDay()).isBetween(595, 605));
    }

    @Test
    void aCorrectedLogIsTheLoggedDayPlusTheBias() {
        assertThat(new IntakeBias(600, 3).corrected(1700)).isEqualTo(2300);
    }

    // ── a changing bias ─────────────────────────────────────────────────────────────────────────────────────

    @Test
    void aChangingBiasIsFollowedNotFrozen() {
        // Two windows 800 under, then two 500 under (the user got better at logging). logging_bias_smoothing 0.5:
        // 800, 800, 650, 575 — moving toward 500 without jumping on one window.
        User user = new User().windows(2, 2800, 800, 7).windows(2, 2800, 500, 7);

        assertThat(estimate(user)).contains(new IntakeBias(575, 4));
    }

    // ── missing days ────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void aDayWithoutALogIsAbsentNotZero() {
        // Four logged days a week at 2200: the mean is 2200, not 4 × 2200 / 7.
        User user = new User().windows(3, 2800, 600, 4);

        assertThat(estimate(user)).contains(new IntakeBias(600, 3));
    }

    @Test
    void aWindowWithTooFewLoggedDaysIsNotUsed() {
        // Three logged days a week is under min_logged_days_per_week: no window is usable, no bias is claimed.
        User user = new User().windows(3, 2800, 600, 3);

        assertThat(estimate(user)).isEmpty();
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

        assertThat(estimate(user)).contains(new IntakeBias(-600, 3));
    }

    // ── decisions and words ─────────────────────────────────────────────────────────────────────────────────

    @Test
    void decisionsNeverReadLoggedFood() {
        // "The measured result beats the declaration": the engine's decision input has no place for logged intake.
        List<String> intakeFields = new ArrayList<>();
        for (Class<?> input : List.of(Snapshot.class, CheckIn.class, EnergyBudget.class)) {
            for (RecordComponent component : input.getRecordComponents()) {
                boolean carriesLogs = component.getType() == DailyIntake.class
                        || component.getGenericType() instanceof ParameterizedType generic
                                && List.of(generic.getActualTypeArguments()).contains(DailyIntake.class);
                if (carriesLogs || component.getName().toLowerCase().contains("logged")) {
                    intakeFields.add(input.getSimpleName() + "." + component.getName());
                }
            }
        }

        assertThat(intakeFields).isEmpty();
    }

    @Test
    void theWordsAboutItNeverBlame() {
        // U7: under-counting is how photo and quick logs work, not a failing of the user.
        Map<String, Object> copy = EngineFixtures.copyGroup(new CopyKey("calibration.logs_run_low"));
        String text = (copy.get("title") + " " + copy.get("body")).toLowerCase();

        assertThat(copy).containsKeys("title", "body");
        assertThat(Set.of("wrong", "lie", "cheat", "forgot", "fault", "should have", "didn't", "mistake", "careless", "honest"))
                .noneMatch(text::contains);
    }

    // ── a synthetic user ────────────────────────────────────────────────────────────────────────────────────

    private static java.util.Optional<IntakeBias> estimate(User user) {
        WeightSeries weights = user.weights(); // also writes the logs
        return IntakeCalibration.estimate(List.copyOf(user.logs), weights, REFERENCE, TODAY, MALE);
    }

    /** True expenditure is REFERENCE; the user eats {@code eats} and logs {@code under} less, on {@code loggedDays} days a week. */
    private static final class User {
        final List<DailyIntake> logs = new ArrayList<>();
        private final List<int[]> plan = new ArrayList<>();

        User windows(int count, int eats, int under, int loggedDays) {
            for (int i = 0; i < count; i++) {
                plan.add(new int[] {eats, under, loggedDays});
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
                weighIns.add(new WeighIn(date, kg));
                if (day % 7 < window[2]) {
                    logs.add(new DailyIntake(date, window[0] - window[1]));
                }
                kg = kg.add(BigDecimal.valueOf(window[0] - REFERENCE).divide(BigDecimal.valueOf(KCAL_PER_KG), MathContext.DECIMAL64));
            }
            return new WeightSeries(weighIns);
        }
    }
}
