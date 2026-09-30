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

    /** {@code stepsPerDay} null: no step target set yet, the starting one applies (K-216). */
    record Plan(Phase phase, LocalDate phaseStart, LocalDate planStart, Integer targetKcal, boolean observingMaintenance, Integer stepsPerDay) {
    }

    /** {@code appliedAt} and the plan before and after it are set once the call is applied; {@code undoneAt} once undone (K-216). */
    record Call(UUID id, UUID clientId, LocalDate weekOf, LocalDate madeOn, Instant decidedAt, String parametersHash, StoredSnapshot snapshot,
            Map<String, Object> decision, Application application, Instant appliedAt, Instant undoneAt, Plan planBefore, Plan planAfter) {

        /** A call as the engine made it, not applied yet. */
        Call(UUID id, UUID clientId, LocalDate weekOf, LocalDate madeOn, Instant decidedAt, String parametersHash, StoredSnapshot snapshot,
                Map<String, Object> decision, Application application) {
            this(id, clientId, weekOf, madeOn, decidedAt, parametersHash, snapshot, decision, application, null, null, null, null);
        }
    }

    /** What a call decided and whether it changed the plan, without its snapshot: enough to follow a hard stop (K-229). */
    record Outcome(Instant decidedAt, Application application, Map<String, Object> decision) {
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
                        row.getBoolean("observing_maintenance"), row.getObject("steps_per_day", Integer.class)))
                .optional();
    }

    /** The first plan; a plan written at the same moment by another request wins and is read back. */
    Plan start(AccountId account, Plan plan) {
        jdbc.sql("""
                insert into decision.plan (account_id, phase, phase_start, plan_start, target_kcal, observing_maintenance, steps_per_day)
                values (:account, :phase, :phaseStart, :planStart, :target, :observing, :steps) on conflict (account_id) do nothing""")
                .param("account", account.value()).param("phase", plan.phase().name()).param("phaseStart", plan.phaseStart())
                .param("planStart", plan.planStart()).param("target", plan.targetKcal()).param("observing", plan.observingMaintenance())
                .param("steps", plan.stepsPerDay()).update();
        return plan(account).orElseThrow();
    }

    /** The plan as a call left it (K-216). */
    void replace(AccountId account, Plan plan) {
        jdbc.sql("""
                update decision.plan set phase = :phase, phase_start = :phaseStart, plan_start = :planStart, target_kcal = :target,
                observing_maintenance = :observing, steps_per_day = :steps where account_id = :account""")
                .param("account", account.value()).param("phase", plan.phase().name()).param("phaseStart", plan.phaseStart())
                .param("planStart", plan.planStart()).param("target", plan.targetKcal()).param("observing", plan.observingMaintenance())
                .param("steps", plan.stepsPerDay()).update();
    }

    /**
     * PENDING → APPLIED with the plan before and after; false when the call was not PENDING. The row stays locked until
     * the transaction ends, so of two requests applying at once only one changes the plan (K-216).
     */
    boolean markApplied(AccountId account, UUID callId, Instant at, Plan before, Plan after) {
        return jdbc.sql("""
                update decision.weekly_call set application = 'APPLIED', applied_at = :at, plan_before = cast(:before as jsonb),
                plan_after = cast(:after as jsonb) where account_id = :account and id = :id and application = 'PENDING'""")
                .param("account", account.value()).param("id", callId).param("at", at.atOffset(ZoneOffset.UTC))
                .param("before", json.writeValueAsString(before)).param("after", json.writeValueAsString(after)).update() == 1;
    }

    /** APPLIED → UNDONE; false when the call was not APPLIED. */
    boolean markUndone(AccountId account, UUID callId, Instant at) {
        return jdbc.sql("""
                update decision.weekly_call set application = 'UNDONE', undone_at = :at
                where account_id = :account and id = :id and application = 'APPLIED'""")
                .param("account", account.value()).param("id", callId).param("at", at.atOffset(ZoneOffset.UTC)).update() == 1;
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

    /**
     * The call, its row locked until the transaction ends: a second apply or undo of it waits, then reads the state the
     * first one left (K-220 review: it read PENDING, then the plan the first one changed, and refused a stale call).
     */
    Optional<Call> lockedById(AccountId account, UUID id) {
        return calls("account_id = :account and id = :id", Map.of("account", account.value(), "id", id), 1, " for update").stream().findFirst();
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

    /** Every call of the account, as its outcome only: the snapshots are not read (K-229 review). */
    @SuppressWarnings("unchecked")
    List<Outcome> outcomes(AccountId account) {
        return jdbc.sql("""
                        select decided_at, application, decision::text as decision_json from decision.weekly_call
                        where account_id = :account order by decided_at desc, id desc""")
                .param("account", account.value())
                .query((row, n) -> new Outcome(row.getObject("decided_at", OffsetDateTime.class).toInstant(),
                        Application.valueOf(row.getString("application")), json.readValue(row.getString("decision_json"), Map.class)))
                .list();
    }

    private List<Call> calls(String where, Map<String, Object> params, int limit) {
        return calls(where, params, limit, "");
    }

    @SuppressWarnings("unchecked")
    private List<Call> calls(String where, Map<String, Object> params, int limit, String lock) {
        return jdbc.sql("""
                        select *, snapshot::text as snapshot_json, decision::text as decision_json, plan_before::text as plan_before_json,
                        plan_after::text as plan_after_json
                        from decision.weekly_call""" + " where " + where + " order by decided_at desc, id desc limit :limit" + lock)
                .params(params).param("limit", limit)
                .query((row, n) -> new Call(row.getObject("id", UUID.class), row.getObject("client_id", UUID.class),
                        row.getObject("week_of", LocalDate.class), row.getObject("made_on", LocalDate.class),
                        row.getObject("decided_at", OffsetDateTime.class).toInstant(), row.getString("parameters_hash"),
                        json.readValue(row.getString("snapshot_json"), StoredSnapshot.class),
                        json.readValue(row.getString("decision_json"), Map.class), Application.valueOf(row.getString("application")),
                        instant(row.getObject("applied_at", OffsetDateTime.class)), instant(row.getObject("undone_at", OffsetDateTime.class)),
                        plan(row.getString("plan_before_json")), plan(row.getString("plan_after_json"))))
                .list();
    }

    private Plan plan(String kept) {
        return kept == null ? null : json.readValue(kept, Plan.class);
    }

    private static Instant instant(OffsetDateTime at) {
        return at == null ? null : at.toInstant();
    }
}
