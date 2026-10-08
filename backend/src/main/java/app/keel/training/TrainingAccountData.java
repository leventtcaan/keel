package app.keel.training;

import app.keel.consent.ConsentKind;
import app.keel.consent.ConsentWithdrawn;
import app.keel.shared.AccountDataExport;
import app.keel.shared.AccountDeletionRequested;
import app.keel.shared.AccountId;
import java.util.Map;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

/**
 * Training's part of the user's data (K-214): every workout with its sets, the program (K-211), what each program asked
 * (K-535) and its calls (K-217), the review's changes to it (K-956), the gyms (K-414), the user's own moves (K-424), the
 * user's own cardio and the cardio sessions done (K-959).
 */
@Component
class TrainingAccountData implements AccountDataExport {

    private final JdbcClient jdbc;
    private final WorkoutStore store;
    private final ProgramStore programs;

    private final TrainingCalls calls;
    private final GymStore gyms;
    private final CustomExerciseStore customs;
    private final ReviewChangeStore reviewChanges;
    private final CardioStore cardio;

    TrainingAccountData(JdbcClient jdbc, WorkoutStore store, ProgramStore programs, TrainingCalls calls, GymStore gyms, CustomExerciseStore customs,
            ReviewChangeStore reviewChanges, CardioStore cardio) {
        this.reviewChanges = reviewChanges;
        this.customs = customs;
        this.cardio = cardio;
        this.calls = calls;
        this.gyms = gyms;
        this.jdbc = jdbc;
        this.store = store;
        this.programs = programs;
    }

    @ApplicationModuleListener
    void on(AccountDeletionRequested deletion) {
        // Sets go with their workout (on delete cascade); deleting by account catches any set whose workout went first.
        jdbc.sql("delete from training.workout_set where account_id = :account").param("account", deletion.account().value()).update();
        jdbc.sql("delete from training.workout where account_id = :account").param("account", deletion.account().value()).update();
        // The program's days and moves go with it (on delete cascade); by account too, as for sets.
        // A gym's weights and machines go with it (on delete cascade); by account too.
        for (String table : new String[] {"program_change", "program_review_change", "program_history", "planned_exercise", "program_day", "program", "gym_weight", "gym_machine", "gym",
            "custom_exercise", "cardio_plan_session", "cardio_plan", "cardio_session"}) {
            jdbc.sql("delete from training." + table + " where account_id = :account").param("account", deletion.account().value()).update();
        }
    }

    /** Of training only a cardio session's active energy is health data (ADR-074 #5, K-231): in the withdrawal's transaction. */
    @EventListener
    void on(ConsentWithdrawn withdrawn) {
        if (withdrawn.kind() == ConsentKind.HEALTH_DATA) {
            cardio.clearActiveEnergy(withdrawn.account());
        }
    }

    @Override
    public String section() {
        return "training";
    }

    @Override
    public Object export(AccountId account) {
        Map<String, Object> training = new java.util.LinkedHashMap<>();
        training.put("workouts", store.all(account).stream()
                .map(workout -> Map.of("workout", workout, "sets", store.sets(workout.id()))).toList());
        programs.current(account).ifPresent(program -> training.put("program", program));
        training.put("programHistory", programs.history(account));
        training.put("programChanges", calls.changes(account));
        training.put("programReviewChanges", reviewChanges.all(account));
        training.put("gyms", gyms.all(account));
        training.put("customExercises", customs.all(account));
        cardio.userPlan(account).ifPresent(own -> training.put("cardioPlan", Map.of("minutes", own.minutes(), "sessions", own.sessions().stream()
                .map(session -> Map.of("weekday", session.day(), "place", session.placement())).toList())));
        training.put("cardioSessions", cardio.all(account));
        return training;
    }
}
