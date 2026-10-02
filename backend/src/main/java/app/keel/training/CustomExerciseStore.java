package app.keel.training;

import app.keel.shared.AccountId;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** The user's own moves (K-424, ADR-035). The first write of a clientId wins (ADR-024). */
@Repository
class CustomExerciseStore {

    /** What a set names it by. */
    static final String PREFIX = "custom:";

    record CustomExercise(UUID id, UUID clientId, String name, ExerciseCatalog.Kind kind, ExerciseCatalog.Load load,
            ExerciseCatalog.Equipment equipment, boolean unilateral) {

        String exerciseId() {
            return PREFIX + id;
        }

        /** As the catalog's moves are read by the set rules: no muscles, alternatives, setup or clips of its own. */
        ExerciseCatalog.Exercise asExercise() {
            return new ExerciseCatalog.Exercise(exerciseId(), kind, List.of(), List.of(), load, equipment, unilateral, List.of(), null, false);
        }
    }

    record Stored(CustomExercise move, boolean created) {
    }

    private final JdbcClient jdbc;

    CustomExerciseStore(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    Stored save(AccountId account, UUID clientId, String name, ExerciseCatalog.Kind kind, ExerciseCatalog.Load load, ExerciseCatalog.Equipment equipment,
            boolean unilateral) {
        int created = jdbc.sql("""
                insert into training.custom_exercise (id, account_id, client_id, name, kind, load, equipment, unilateral, created_at)
                values (:id, :account, :client, :name, :kind, :load, :equipment, :unilateral, now())
                on conflict (account_id, client_id) do nothing""")
                .param("id", UUID.randomUUID()).param("account", account.value()).param("client", clientId).param("name", name)
                .param("kind", kind.name()).param("load", load.name()).param("equipment", equipment.name()).param("unilateral", unilateral).update();
        CustomExercise move = jdbc.sql("select * from training.custom_exercise where account_id = :account and client_id = :client")
                .param("account", account.value()).param("client", clientId).query((row, n) -> move(row)).single();
        return new Stored(move, created == 1);
    }

    Optional<CustomExercise> findByClient(AccountId account, UUID clientId) {
        return jdbc.sql("select * from training.custom_exercise where account_id = :account and client_id = :client")
                .param("account", account.value()).param("client", clientId).query((row, n) -> move(row)).optional();
    }

    /** The account's own move named by a set's exerciseId ("custom:<uuid>"); empty for anything else. */
    Optional<CustomExercise> find(AccountId account, String exerciseId) {
        if (exerciseId == null || !exerciseId.startsWith(PREFIX)) {
            return Optional.empty();
        }
        UUID id;
        try {
            id = UUID.fromString(exerciseId.substring(PREFIX.length()));
        } catch (IllegalArgumentException notAnId) {
            return Optional.empty();
        }
        return jdbc.sql("select * from training.custom_exercise where account_id = :account and id = :id")
                .param("account", account.value()).param("id", id).query((row, n) -> move(row)).optional();
    }

    /** Every move of the account, by name (case aside); the export too (K-214). */
    List<CustomExercise> all(AccountId account) {
        return jdbc.sql("select * from training.custom_exercise where account_id = :account order by lower(name), name, id")
                .param("account", account.value()).query((row, n) -> move(row)).list();
    }

    int count(AccountId account) {
        return jdbc.sql("select count(*) from training.custom_exercise where account_id = :account").param("account", account.value())
                .query(Integer.class).single();
    }

    private static CustomExercise move(ResultSet row) throws SQLException {
        return new CustomExercise(row.getObject("id", UUID.class), row.getObject("client_id", UUID.class), row.getString("name"),
                ExerciseCatalog.Kind.valueOf(row.getString("kind")), ExerciseCatalog.Load.valueOf(row.getString("load")),
                ExerciseCatalog.Equipment.valueOf(row.getString("equipment")), row.getBoolean("unilateral"));
    }
}
