package app.keel.decision;

import app.keel.engine.Phase;
import app.keel.shared.AccountId;
import app.keel.training.CurrentPhase;
import java.util.Optional;
import org.springframework.stereotype.Component;

/**
 * The phase in force for training's cardio default (K-959's CurrentPhase, ADR-074 #1), set by calls: training asks
 * through its own interface and decision answers, so the dependency stays one way (as PlanDailyTargets).
 */
@Component
class PlanPhase implements CurrentPhase {

    private final DecisionService decisions;

    PlanPhase(DecisionService decisions) {
        this.decisions = decisions;
    }

    @Override
    public Optional<Phase> of(AccountId account) {
        return decisions.phaseNow(account);
    }
}
