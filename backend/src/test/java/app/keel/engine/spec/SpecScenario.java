package app.keel.engine.spec;

import app.keel.engine.CheckIn;
import app.keel.engine.CheckIn.Appetite;
import app.keel.engine.CheckIn.Look;
import app.keel.engine.CheckIn.Recovery;
import app.keel.engine.CheckIn.Training;
import app.keel.engine.CheckIn.Waist;
import app.keel.engine.EnergyBudget;
import app.keel.engine.InitialTarget;
import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import app.keel.engine.Phase;
import app.keel.engine.Profile;
import app.keel.engine.RepositoryParameters;
import app.keel.engine.Sex;
import app.keel.engine.Snapshot;
import app.keel.engine.TrainingStatus;
import app.keel.engine.WeighIn;
import app.keel.engine.WeightSeries;
import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Turns a specification row's {@code given} (plain domain words) into a real Snapshot. Anything a row does not mention
 * is an ordinary user who follows the plan: a man, on a bulk unless the row says otherwise, weighed every morning, weight
 * moving toward the goal, 90 % of the plan done, training stable, 30 years old and 180 cm, with a plan target and 300 kcal
 * of exercise a day. So each row changes only what it is about.
 */
final class SpecScenario {

    static final LocalDate TODAY = LocalDate.of(2026, 10, 26);

    private static final Set<String> KNOWN = Set.of("sex", "phase", "days_since_start", "weighins_last_7", "adherence",
            "days_in_window", "trend", "flat_weeks", "look", "training", "recovery", "waist", "bodyweight_kg", "weekly_loss_kg",
            "bodyweight_8w_ago_kg", "calories_after_step_below_bmr", "fat_proxy_pct", "target_kcal", "exercise_kcal",
            "menstrual_loss_reported", "user_pushback", "new_data", "lift", "stalled_sessions", "load_increase_stopped",
            "plan_missed_weeks", "months_without_progress", "loads_below_last_week", "appetite", "forcing_food");
    private static final Profile PROFILE = new Profile(30, 180);
    private static final int EXERCISE_KCAL = 300;

    private SpecScenario() {
    }

    record Built(Snapshot snapshot, Parameters parameters) {
    }

    static Built from(Map<String, Object> given) {
        List<String> unknown = given.keySet().stream().filter(key -> !KNOWN.contains(key)).toList();
        if (!unknown.isEmpty()) {
            throw new IllegalArgumentException("The runner does not know " + unknown + "; teach SpecScenario the new words");
        }
        Sex sex = Sex.valueOf(text(given, "sex", "male").toUpperCase(Locale.ROOT));
        Phase phase = Phase.valueOf(text(given, "phase", "bulk").toUpperCase(Locale.ROOT));
        Parameters parameters = RepositoryParameters.forSex(sex);
        int windowDays = parameters.wholeNumber(ParameterKey.DECISION_WINDOW_DAYS);
        BigDecimal base = decimal(given, "bodyweight_kg", phase == Phase.CUT ? "80" : "70");

        List<WeighIn> weighIns;
        LocalDate planStart;
        if (given.containsKey("days_since_start")) {
            int days = number(given, "days_since_start");
            planStart = TODAY.minusDays(days - 1L);
            weighIns = daily(planStart, TODAY, base);
        } else if (given.containsKey("weekly_loss_kg")) {
            BigDecimal before = base.add(decimal(given, "weekly_loss_kg", "0"));
            weighIns = new ArrayList<>(daily(TODAY.minusDays(40), TODAY.minusDays(7), before));
            weighIns.addAll(daily(TODAY.minusDays(6), TODAY, base));
            planStart = TODAY.minusDays(40);
        } else if (given.containsKey("bodyweight_8w_ago_kg")) {
            weighIns = stillLosing(decimal(given, "bodyweight_8w_ago_kg", "0"), base);
            planStart = TODAY.minusDays(62);
        } else {
            List<BigDecimal> weeks = weeks(given, phase, sex, base, windowDays / 7);
            LocalDate first = TODAY.minusDays(7L * weeks.size() - 1);
            weighIns = new ArrayList<>(daily(first.minusDays(14), first.minusDays(1), weeks.getFirst()));
            for (int week = 0; week < weeks.size(); week++) {
                weighIns.addAll(daily(first.plusDays(7L * week), first.plusDays(7L * week + 6), weeks.get(week)));
            }
            planStart = given.containsKey("days_in_window") ? TODAY.minusDays(number(given, "days_in_window") - 1L) : first;
        }

        int target = given.containsKey("target_kcal") ? number(given, "target_kcal") : phase == Phase.CUT ? 2600 : 3000;
        if (Boolean.TRUE.equals(given.get("calories_after_step_below_bmr"))) {
            // The next cut step lands 100 kcal under resting energy (Mifflin for this profile and weight).
            int resting = InitialTarget.restingKcal(sex, base, PROFILE, parameters);
            target = resting + parameters.wholeNumber(ParameterKey.CUT_STEP_MIN_KCAL) - 100;
        }
        int exercise = given.containsKey("exercise_kcal") ? number(given, "exercise_kcal") : EXERCISE_KCAL;

        Snapshot snapshot = new Snapshot(TODAY, sex, phase, planStart, new WeightSeries(weighIns),
                given.containsKey("fat_proxy_pct") ? Optional.of(decimal(given, "fat_proxy_pct", "0")) : Optional.empty())
                .withEnergy(new EnergyBudget(target, exercise))
                .withProfile(PROFILE)
                .withCheckIn(checkIn(given))
                .withMenstrualLossReported(Boolean.TRUE.equals(given.get("menstrual_loss_reported")))
                .withPhaseStart(planStart.minusMonths(6));
        return new Built(training(given, parameters).map(snapshot::withTraining).orElse(snapshot), parameters);
    }

    /** Weekly means of the decision window, oldest first. */
    private static List<BigDecimal> weeks(Map<String, Object> given, Phase phase, Sex sex, BigDecimal base, int count) {
        BigDecimal toward = phase == Phase.CUT ? BigDecimal.ONE.negate() : BigDecimal.ONE; // kg per week toward the goal
        List<BigDecimal> weeks = new ArrayList<>();
        if (!"flat".equals(given.get("trend"))) {
            for (int week = 0; week < count; week++) {
                weeks.add(base.add(toward.multiply(new BigDecimal("0.5")).multiply(BigDecimal.valueOf(week - count + 1L))));
            }
            return weeks;
        }
        int flatWeeks = given.containsKey("flat_weeks") ? number(given, "flat_weeks") : count - 1;
        if (flatWeeks >= count - 1) {
            for (int week = 0; week < count; week++) {
                weeks.add(base);
            }
            return weeks;
        }
        if (flatWeeks == 1 && sex == Sex.FEMALE) {
            // ADR-021: one flat week inside a flat 28-day window — a drop two weeks ago, then a week held.
            weeks.addAll(List.of(base, base.subtract(toward.multiply(new BigDecimal("0.7"))), base, base));
            return weeks;
        }
        throw new IllegalArgumentException("flat_weeks " + flatWeeks + " with a flat window cannot happen for " + sex + " (ADR-021)");
    }

    private static CheckIn checkIn(Map<String, Object> given) {
        CheckIn checkIn = CheckIn.NONE.withAdherence(decimal(given, "adherence", "0.9"))
                .withTraining(Training.valueOf(text(given, "training", "stable").toUpperCase(Locale.ROOT)));
        if (given.containsKey("look")) {
            checkIn = checkIn.withLook(Look.valueOf(text(given, "look", "").toUpperCase(Locale.ROOT)));
        }
        if (given.containsKey("recovery")) {
            checkIn = checkIn.withRecovery(Recovery.valueOf(text(given, "recovery", "").toUpperCase(Locale.ROOT)));
        }
        if (given.containsKey("waist")) {
            checkIn = checkIn.withWaist(Waist.valueOf(text(given, "waist", "").toUpperCase(Locale.ROOT)));
        }
        if ("gone".equals(given.get("appetite")) || Boolean.TRUE.equals(given.get("forcing_food"))) {
            checkIn = checkIn.withAppetite(Appetite.GONE);
        }
        return checkIn;
    }

    private static Optional<TrainingStatus> training(Map<String, Object> given, Parameters parameters) {
        boolean mentioned = given.containsKey("lift") || given.containsKey("plan_missed_weeks")
                || given.containsKey("months_without_progress") || given.containsKey("loads_below_last_week");
        if (!mentioned) {
            return Optional.empty();
        }
        int months = given.containsKey("months_without_progress") ? number(given, "months_without_progress") : 0;
        int stalled = given.containsKey("stalled_sessions") ? number(given, "stalled_sessions")
                : months > 0 ? parameters.wholeNumber(ParameterKey.PLATEAU_SESSIONS) : 0;
        int held = Boolean.TRUE.equals(given.get("load_increase_stopped")) ? 1 : 0;
        return Optional.of(new TrainingStatus(stalled, held, months, false)
                .withLoadsBelowLastWeek(Boolean.TRUE.equals(given.get("loads_below_last_week")))
                .withWeeksPlanMissed(given.containsKey("plan_missed_weeks") ? number(given, "plan_missed_weeks") : 0));
    }

    /** From {@code then} 8 weeks ago down to {@code now}, still losing 0.1 kg in the last week (the weekly cap stays quiet). */
    private static List<WeighIn> stillLosing(BigDecimal then, BigDecimal now) {
        List<WeighIn> weighIns = new ArrayList<>(daily(TODAY.minusDays(62), TODAY.minusDays(56), then));
        BigDecimal perDay = then.subtract(now.add(new BigDecimal("0.2"))).divide(BigDecimal.valueOf(42), MathContext.DECIMAL64);
        for (int ago = 55; ago > 14; ago--) {
            weighIns.add(new WeighIn(TODAY.minusDays(ago), then.subtract(perDay.multiply(BigDecimal.valueOf(56L - ago)))));
        }
        weighIns.addAll(daily(TODAY.minusDays(13), TODAY.minusDays(7), now.add(new BigDecimal("0.1"))));
        weighIns.addAll(daily(TODAY.minusDays(6), TODAY, now));
        return weighIns;
    }

    private static List<WeighIn> daily(LocalDate first, LocalDate last, BigDecimal kg) {
        List<WeighIn> weighIns = new ArrayList<>();
        for (LocalDate day = first; !day.isAfter(last); day = day.plusDays(1)) {
            weighIns.add(new WeighIn(day, kg));
        }
        return weighIns;
    }

    private static String text(Map<String, Object> given, String key, String fallback) {
        Object value = given.get(key);
        return value == null ? fallback : value.toString();
    }

    private static int number(Map<String, Object> given, String key) {
        return ((Number) given.get(key)).intValue();
    }

    private static BigDecimal decimal(Map<String, Object> given, String key, String fallback) {
        Object value = given.get(key);
        return new BigDecimal(value == null ? fallback : value.toString());
    }
}
