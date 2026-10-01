package app.keel.training;

import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.Decimals;
import app.keel.shared.ErrorCode;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/** The gym tables (K-414, ADR-032): a gym with its plates, dumbbells and machines, replaced whole. */
@Repository
class GymStore {

    /**
     * A gym as stored: plates heaviest first, dumbbells lightest first (the order a rack and a plate tree are read in),
     * machines by move.
     */
    record Gym(UUID id, String name, boolean current, BigDecimal barKg, List<BigDecimal> platesKg, List<BigDecimal> dumbbellsKg,
            BigDecimal stackStepKg, Map<String, BigDecimal> machineStepsKg) {
    }

    private final JdbcClient jdbc;

    GymStore(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Stores the gym whole under its id, in one transaction, and returns it as stored. The account's writes go one at a
     * time (a transaction lock on the account): two gyms made "current" at the same moment, or two new gyms past the
     * ceiling, cannot both pass. A refusal is thrown, so nothing of the write stays: a new gym past the ceiling is
     * VALIDATION_FAILED, an id that is another account's gym CONFLICT — checked again by the write itself, as another
     * account's write is not held by this account's lock (K-414 review).
     */
    @Transactional
    Gym put(AccountId account, Gym gym, int ceiling) {
        jdbc.sql("select 1 from pg_advisory_xact_lock(:key)").param("key", lockKey(account)).query(Integer.class).single();
        Optional<UUID> owner = jdbc.sql("select account_id from training.gym where id = :id").param("id", gym.id()).query(UUID.class).optional();
        if (owner.isPresent() && !owner.get().equals(account.value())) {
            throw new ApiException(ErrorCode.CONFLICT);
        }
        if (owner.isEmpty() && jdbc.sql("select count(*) from training.gym where account_id = :account").param("account", account.value())
                .query(Integer.class).single() >= ceiling) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        if (gym.current()) {
            jdbc.sql("update training.gym set current = false where account_id = :account and id <> :id and current")
                    .param("account", account.value()).param("id", gym.id()).update();
        }
        int written = jdbc.sql("""
                insert into training.gym (id, account_id, name, current, bar_kg, stack_step_kg)
                values (:id, :account, :name, :current, :bar, :step)
                on conflict (id) do update set name = excluded.name, current = excluded.current, bar_kg = excluded.bar_kg,
                    stack_step_kg = excluded.stack_step_kg
                where training.gym.account_id = excluded.account_id""")
                .param("id", gym.id()).param("account", account.value()).param("name", gym.name()).param("current", gym.current())
                .param("bar", gym.barKg()).param("step", gym.stackStepKg()).update();
        if (written == 0) {
            throw new ApiException(ErrorCode.CONFLICT);
        }
        jdbc.sql("delete from training.gym_weight where gym_id = :id").param("id", gym.id()).update();
        jdbc.sql("delete from training.gym_machine where gym_id = :id").param("id", gym.id()).update();
        insertWeights(account, gym.id(), "PLATE", gym.platesKg());
        insertWeights(account, gym.id(), "DUMBBELL", gym.dumbbellsKg());
        gym.machineStepsKg().forEach((exercise, step) -> jdbc.sql("""
                insert into training.gym_machine (gym_id, account_id, exercise_id, step_kg) values (:gym, :account, :exercise, :step)""")
                .param("gym", gym.id()).param("account", account.value()).param("exercise", exercise).param("step", step).update());
        return all(account).stream().filter(stored -> stored.id().equals(gym.id())).findFirst().orElseThrow();
    }

    /** The account's gyms, by name (a handful: at most the ceiling). */
    List<Gym> all(AccountId account) {
        record Row(UUID id, String name, boolean current, BigDecimal barKg, BigDecimal stackStepKg) {
        }
        List<Row> rows = jdbc.sql("select * from training.gym where account_id = :account order by name, id")
                .param("account", account.value()).query((row, n) -> new Row(row.getObject("id", UUID.class), row.getString("name"),
                        row.getBoolean("current"), plain(row, "bar_kg"), plain(row, "stack_step_kg"))).list();
        if (rows.isEmpty()) {
            return List.of();
        }
        record Weight(UUID gym, String kind, BigDecimal kg) {
        }
        Map<UUID, List<Weight>> weights = jdbc.sql("select * from training.gym_weight where account_id = :account").param("account", account.value())
                .query((row, n) -> new Weight(row.getObject("gym_id", UUID.class), row.getString("kind"), plain(row, "kg"))).list().stream()
                .collect(Collectors.groupingBy(Weight::gym));
        record Machine(UUID gym, String exercise, BigDecimal step) {
        }
        Map<UUID, List<Machine>> machines = jdbc.sql("select * from training.gym_machine where account_id = :account").param("account", account.value())
                .query((row, n) -> new Machine(row.getObject("gym_id", UUID.class), row.getString("exercise_id"), plain(row, "step_kg"))).list()
                .stream().collect(Collectors.groupingBy(Machine::gym));
        return rows.stream().map(row -> {
            List<Weight> held = weights.getOrDefault(row.id(), List.of());
            return new Gym(row.id(), row.name(), row.current(), row.barKg(),
                    held.stream().filter(w -> w.kind().equals("PLATE")).map(Weight::kg).sorted(Comparator.reverseOrder()).toList(),
                    held.stream().filter(w -> w.kind().equals("DUMBBELL")).map(Weight::kg).sorted().toList(), row.stackStepKg(),
                    machines.getOrDefault(row.id(), List.of()).stream().sorted(Comparator.comparing(Machine::exercise))
                            .collect(Collectors.toMap(Machine::exercise, Machine::step, (a, b) -> a, java.util.LinkedHashMap::new)));
        }).toList();
    }

    /** The gym in use, if one is. */
    Optional<Gym> current(AccountId account) {
        return all(account).stream().filter(Gym::current).findFirst();
    }

    void delete(AccountId account, UUID id) {
        jdbc.sql("delete from training.gym where id = :id and account_id = :account").param("id", id).param("account", account.value()).update();
    }

    private void insertWeights(AccountId account, UUID gym, String kind, List<BigDecimal> weights) {
        for (BigDecimal kg : weights) {
            jdbc.sql("insert into training.gym_weight (gym_id, account_id, kind, kg) values (:gym, :account, :kind, :kg)")
                    .param("gym", gym).param("account", account.value()).param("kind", kind).param("kg", kg).update();
        }
    }

    private static BigDecimal plain(ResultSet row, String column) throws SQLException {
        BigDecimal value = row.getBigDecimal(column);
        return value == null ? null : Decimals.plain(value);
    }

    /** The account's lock key: its id folded to the 64 bits an advisory lock takes. */
    private static long lockKey(AccountId account) {
        return account.value().getMostSignificantBits() ^ account.value().getLeastSignificantBits();
    }
}
