package app.keel.decision;

import app.keel.shared.AccountDataExport;
import app.keel.shared.AccountDeletionRequested;
import app.keel.shared.AccountId;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

/** Decision's part of the user's data (K-214, K-212): the plan and every call with the Snapshot it was made from. */
@Component
class DecisionAccountData implements AccountDataExport {

    private final JdbcClient jdbc;
    private final CallStore calls;

    DecisionAccountData(JdbcClient jdbc, CallStore calls) {
        this.jdbc = jdbc;
        this.calls = calls;
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
            entry.put("snapshot", call.snapshot());
            return entry;
        }).toList());
        return decision;
    }
}
