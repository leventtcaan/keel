package app.keel.decision;

import app.keel.engine.Consistency;
import app.keel.engine.MacroTargets;
import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import app.keel.engine.Sex;
import app.keel.engine.WeighIn;
import app.keel.measurement.Measurements;
import app.keel.nutrition.MealTotals;
import app.keel.profile.ProfileFacts;
import app.keel.shared.AccountId;
import app.keel.training.TrainingLog;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;

/**
 * The adherence the spine reads (K-220, ADR-020 L-6): the window's weeks tallied from the modules' logs — workouts
 * (training), weigh-ins and step counts (measurement), meals (nutrition) — never their tables.
 */
@Component
class WeekLogs {

    private final TrainingLog training;
    private final Measurements measurements;
    private final MealTotals meals;

    WeekLogs(TrainingLog training, Measurements measurements, MealTotals meals) {
        this.training = training;
        this.measurements = measurements;
        this.meals = meals;
    }

    /**
     * Done over planned over the decision window's weeks; empty when nothing was planned in them. Protein days are judged
     * against the protein at {@code bodyweight}; without one they are not judged.
     */
    Optional<BigDecimal> adherence(AccountId account, ProfileFacts profile, LocalDate today, CallStore.Plan plan, Optional<BigDecimal> bodyweight,
            int ageYears, Parameters parameters) {
        List<LocalDate> weeks = WeekTallies.weeks(today, parameters.wholeNumber(ParameterKey.DECISION_WINDOW_DAYS));
        if (weeks.isEmpty()) {
            return Optional.empty();
        }
        LocalDate from = weeks.getFirst();
        LocalDate to = weeks.getLast().plusWeeks(1).minusDays(1);
        ZoneId zone = profile.timeZone();
        List<LocalDate> workoutDays = training.workoutStarts(account, from.atStartOfDay(zone).toInstant(), to.plusDays(1).atStartOfDay(zone).toInstant())
                .stream().map(started -> started.atZone(zone).toLocalDate()).toList();
        Map<LocalDate, WeekTallies.ProteinLogged> protein = bodyweight.isEmpty() ? Map.of() : meals.proteinByDay(account, from, to).entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, day -> new WeekTallies.ProteinLogged(day.getValue().lowG(), day.getValue().highG())));
        WeekTallies.Logs logs = new WeekTallies.Logs(workoutDays,
                measurements.dailyWeights(account, from, to).stream().map(WeighIn::date).collect(Collectors.toSet()), protein,
                measurements.stepsByDay(account, from, to));
        int proteinG = bodyweight.map(kg -> MacroTargets.proteinG(kg, Sex.valueOf(profile.sex().name()), ageYears, parameters)).orElse(0);
        WeekTallies.Plan asked = new WeekTallies.Plan(profile.trainingDays().size(), parameters.wholeNumber(ParameterKey.MIN_WEIGHINS_PER_WEEK), proteinG,
                PlanChange.steps(plan, parameters));
        return Consistency.windowRatio(WeekTallies.of(weeks, logs, asked));
    }
}
