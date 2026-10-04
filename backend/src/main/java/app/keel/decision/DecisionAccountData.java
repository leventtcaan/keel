package app.keel.decision;

import app.keel.shared.AccountDataExport;
import app.keel.consent.ConsentKind;
import app.keel.consent.ConsentWithdrawn;
import app.keel.shared.AccountDeletionRequested;
import app.keel.shared.AccountId;
import app.keel.training.TrainingCalls;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/**
 * Decision's part of the user's data (K-214, K-212): the plan, every call with the Snapshot it was made from, and the states
 * the user declared (K-516).
 */
@Component
class DecisionAccountData implements AccountDataExport {

    private final JdbcClient jdbc;
    private final CallStore calls;
    private final JsonMapper json;
    private final TrainingCalls training;
    private final StateStore states;
    private final PromptStore prompts;

    DecisionAccountData(JdbcClient jdbc, CallStore calls, JsonMapper json, TrainingCalls training, StateStore states, PromptStore prompts) {
        this.prompts = prompts;
        this.jdbc = jdbc;
        this.calls = calls;
        this.json = json;
        this.training = training;
        this.states = states;
    }

    @ApplicationModuleListener
    void on(AccountDeletionRequested deletion) {
        delete(deletion.account());
    }

    /**
     * Every call holds the Snapshot it was made from and the plan its targets (K-231): health data, in the withdrawal's
     * transaction. A safety hold goes with the calls it was read from, as on account deletion; the engine starts again
     * from no data (its own observation and questions). A load the calls held on the program is no longer held: no call
     * is left to end it (K-428, ADR-037 #34); the rest of the program is training data and stays (ADR-007).
     */
    @EventListener
    void on(ConsentWithdrawn withdrawn) {
        if (withdrawn.kind() == ConsentKind.HEALTH_DATA) {
            delete(withdrawn.account());
            training.endHold(withdrawn.account());
        }
    }

    private void delete(AccountId account) {
        jdbc.sql("delete from decision.weekly_call where account_id = :account").param("account", account.value()).update();
        jdbc.sql("delete from decision.plan where account_id = :account").param("account", account.value()).update();
        jdbc.sql("delete from decision.declared_state where account_id = :account").param("account", account.value()).update();
        jdbc.sql("delete from decision.prompt_answer where account_id = :account").param("account", account.value()).update();
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
            // As the call kept it, the engine's internal fat estimate included (ADR-063 #1, GDPR Art. 15): the user's own data, in
            // the file they asked for. It is never shown as a number in the app (U4).
            entry.put("snapshot", json.convertValue(call.snapshot(), Map.class));
            return entry;
        }).toList());
        // Each with the day the user last said it still was (K-525): their answer, so theirs to take.
        decision.put("declaredStates", states.all(account).stream().map(state -> {
            Map<String, Object> entry = new LinkedHashMap<>(json.convertValue(StateController.DeclaredState.of(state), Map.class));
            state.stillSoOn().ifPresent(day -> entry.put("stillSoOn", day.toString()));
            return entry;
        }).toList());
        decision.put("promptAnswers", prompts.all(account));
        return decision;
    }
}
