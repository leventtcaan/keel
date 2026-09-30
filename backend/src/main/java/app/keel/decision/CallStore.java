package app.keel.decision;

import app.keel.engine.Phase;
import app.keel.shared.AccountId;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.json.JsonMapper;

/** The plan and the calls (K-212). A call's Snapshot and decision are kept as JSON (jsonb), exactly as made. */
@Repository
class CallStore {

    enum Application { NOT_NEEDED, PENDING, APPLIED, UNDONE }

    record Plan(Phase phase, LocalDate phaseStart, LocalDate planStart, Integer targetKcal, boolean observingMaintenance) {
    }

    record Call(UUID id, UUID clientId, LocalDate weekOf, LocalDate madeOn, Instant decidedAt, String parametersHash, StoredSnapshot snapshot,
            Map<String, Object> decision, Application application) {
    }

    private final JdbcClient jdbc;
    private final JsonMapper json;

    CallStore(JdbcClient jdbc, JsonMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    Optional<Plan> plan(AccountId account) {
        return jdbc.sql("select * from decision.plan where account_id = :account").param("account", account.value())
                .query((row, n) -> new Plan(Phase.valueOf(row.getString("phase")), row.getObject("phase_start", LocalDate.class),
                        row.getObject("plan_start", LocalDate.class), row.getObject("target_kcal", Integer.class),
                        row.getBoolean("observing_maintenance")))
                .optional();
    }

    /** The first plan; a plan written at the same moment by another request wins and is read back. */
    Plan start(AccountId account, Plan plan) {
        jdbc.sql("""
                insert into decision.plan (account_id, phase, phase_start, plan_start, target_kcal, observing_maintenance)
                values (:account, :phase, :phaseStart, :planStart, :target, :observing) on conflict (account_id) do nothing""")
                .param("account", account.value()).param("phase", plan.phase().name()).param("phaseStart", plan.phaseStart())
                .param("planStart", plan.planStart()).param("target", plan.targetKcal()).param("observing", plan.observingMaintenance()).update();
        return plan(account).orElseThrow();
    }

    /** Keeps the call; false when this account already has one for that week or that clientId (the caller reads it back). */
    boolean keep(AccountId account, Call call) {
        return jdbc.sql("""
                insert into decision.weekly_call (id, account_id, client_id, week_of, made_on, decided_at, parameters_hash, snapshot, decision, application)
                values (:id, :account, :client, :week, :madeOn, :at, :hash, cast(:snapshot as jsonb), cast(:decision as jsonb), :application)
                on conflict do nothing""")
                .param("id", call.id()).param("account", account.value()).param("client", call.clientId()).param("week", call.weekOf())
                .param("madeOn", call.madeOn()).param("at", call.decidedAt().atOffset(ZoneOffset.UTC)).param("hash", call.parametersHash())
                .param("snapshot", json.writeValueAsString(call.snapshot())).param("decision", json.writeValueAsString(call.decision()))
                .param("application", call.application().name()).update() == 1;
    }

    Optional<Call> byClient(AccountId account, UUID clientId) {
        return calls("account_id = :account and client_id = :client", Map.of("account", account.value(), "client", clientId), 1).stream().findFirst();
    }

    Optional<Call> byWeek(AccountId account, LocalDate weekOf) {
        return calls("account_id = :account and week_of = :week", Map.of("account", account.value(), "week", weekOf), 1).stream().findFirst();
    }

    Optional<Call> byId(AccountId account, UUID id) {
        return calls("account_id = :account and id = :id", Map.of("account", account.value(), "id", id), 1).stream().findFirst();
    }

    /** Newest first; {@code before} a call's id continues after it (the ledger's cursor). */
    List<Call> newestFirst(AccountId account, Optional<Call> before, int limit) {
        return before.map(after -> calls("account_id = :account and (decided_at, id) < (:at, :id)",
                        Map.of("account", account.value(), "at", after.decidedAt().atOffset(ZoneOffset.UTC), "id", after.id()), limit))
                .orElseGet(() -> calls("account_id = :account", Map.of("account", account.value()), limit));
    }

    /** Every call of the account (the export, K-214). */
    List<Call> all(AccountId account) {
        return calls("account_id = :account", Map.of("account", account.value()), Integer.MAX_VALUE);
    }

    @SuppressWarnings("unchecked")
    private List<Call> calls(String where, Map<String, Object> params, int limit) {
        return jdbc.sql("select *, snapshot::text as snapshot_json, decision::text as decision_json from decision.weekly_call where " + where
                        + " order by decided_at desc, id desc limit :limit")
                .params(params).param("limit", limit)
                .query((row, n) -> new Call(row.getObject("id", UUID.class), row.getObject("client_id", UUID.class),
                        row.getObject("week_of", LocalDate.class), row.getObject("made_on", LocalDate.class),
                        row.getObject("decided_at", OffsetDateTime.class).toInstant(), row.getString("parameters_hash"),
                        json.readValue(row.getString("snapshot_json"), StoredSnapshot.class),
                        json.readValue(row.getString("decision_json"), Map.class), Application.valueOf(row.getString("application"))))
                .list();
    }
}
