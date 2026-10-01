package app.keel.decision;

import app.keel.shared.AccountDataExport;
import app.keel.shared.AccountDeletionRequested;
import app.keel.shared.AccountId;
import java.util.LinkedHashMap;
import java.util.Map;
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
        jdbc.sql("delete from decision.weekly_call where account_id = :account").param("account", deletion.account().value()).update();
        jdbc.sql("delete from decision.plan where account_id = :account").param("account", deletion.account().value()).update();
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
            snapshot.remove("fatProxyEnergyPct");
            entry.put("snapshot", snapshot);
            return entry;
        }).toList());
        return decision;
    }
}
