package app.keel.training;

import app.keel.shared.AccountDataExport;
import app.keel.shared.AccountDeletionRequested;
import app.keel.shared.AccountId;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

/** Training's part of the user's data (K-214): every workout with its sets, the program (K-211) and its calls (K-217). */
@Component
class TrainingAccountData implements AccountDataExport {

    private final JdbcClient jdbc;
    private final WorkoutStore store;
    private final ProgramStore programs;

    private final TrainingCalls calls;

    TrainingAccountData(JdbcClient jdbc, WorkoutStore store, ProgramStore programs, TrainingCalls calls) {
        this.calls = calls;
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
        for (String table : new String[] {"program_change", "planned_exercise", "program_day", "program"}) {
            jdbc.sql("delete from training." + table + " where account_id = :account").param("account", deletion.account().value()).update();
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
        training.put("programChanges", calls.changes(account));
        return training;
    }
}
