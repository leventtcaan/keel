package app.keel.training;

import app.keel.shared.AccountDataExport;
import app.keel.shared.AccountDeletionRequested;
import app.keel.shared.AccountId;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

/** Training's part of the user's data (K-214): every workout with its sets. */
@Component
class TrainingAccountData implements AccountDataExport {

    private final JdbcClient jdbc;
    private final WorkoutStore store;

    TrainingAccountData(JdbcClient jdbc, WorkoutStore store) {
        this.jdbc = jdbc;
        this.store = store;
    }

    @ApplicationModuleListener
    void on(AccountDeletionRequested deletion) {
        // Sets go with their workout (on delete cascade); deleting by account catches any set whose workout went first.
        jdbc.sql("delete from training.workout_set where account_id = :account").param("account", deletion.account().value()).update();
        jdbc.sql("delete from training.workout where account_id = :account").param("account", deletion.account().value()).update();
    }

    @Override
    public String section() {
        return "training";
    }

    @Override
    public Object export(AccountId account) {
        return Map.of("workouts", store.all(account).stream()
                .map(workout -> Map.of("workout", workout, "sets", store.sets(workout.id()))).toList());
    }
}
