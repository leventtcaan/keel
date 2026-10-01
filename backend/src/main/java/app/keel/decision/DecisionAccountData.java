package app.keel.decision;

import app.keel.shared.AccountDataExport;
import app.keel.consent.ConsentKind;
import app.keel.consent.ConsentWithdrawn;
import app.keel.shared.AccountDeletionRequested;
import app.keel.shared.AccountId;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/** Decision's part of the user's data (K-214, K-212): the plan and every call with the Snapshot it was made from. */
@Component
class DecisionAccountData implements AccountDataExport {

    private final JdbcClient jdbc;
    private final CallStore calls;
    private final JsonMapper json;

    DecisionAccountData(JdbcClient jdbc, CallStore calls, JsonMapper json) {
        this.jdbc = jdbc;
        this.calls = calls;
        this.json = json;
    }

    @ApplicationModuleListener
    void on(AccountDeletionRequested deletion) {
        delete(deletion.account());
    }

    /**
     * Every call holds the Snapshot it was made from and the plan its targets (K-231): health data, in the withdrawal's
     * transaction. A safety hold goes with the calls it was read from, as on account deletion; the engine starts again
     * from no data (its own observation and questions).
     */
    @EventListener
    void on(ConsentWithdrawn withdrawn) {
        if (withdrawn.kind() == ConsentKind.HEALTH_DATA) {
            delete(withdrawn.account());
        }
    }

    private void delete(AccountId account) {
        jdbc.sql("delete from decision.weekly_call where account_id = :account").param("account", account.value()).update();
        jdbc.sql("delete from decision.plan where account_id = :account").param("account", account.value()).update();
    }

    @Override
    public String section() {
        return "decision";
    }

    @Override
    public Object export(AccountId account) {
        Map<String, Object> decision = new LinkedHashMap<>();
        calls.plan(account).ifPresent(plan -> decision.put("plan", plan));
        decision.put("calls", calls.all(account).stream().map(call -> {
            Map<String, Object> entry = new LinkedHashMap<>(DecisionController.view(call));
            entry.put("weekOf", call.weekOf());
            if (call.planBefore() != null) {
                entry.put("planBefore", call.planBefore());
                entry.put("planAfter", call.planAfter());
            }
            // U4: the fat estimate is an engine input and never leaves as a number, not even in the user's own export.
            Map<String, Object> snapshot = json.convertValue(call.snapshot(), Map.class);
            snapshot.remove("fatProxyPct");
            snapshot.remove("fatProxyHighPct");
            entry.put("snapshot", snapshot);
            return entry;
        }).toList());
        return decision;
    }
}
