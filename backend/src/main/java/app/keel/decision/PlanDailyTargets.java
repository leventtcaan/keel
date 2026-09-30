package app.keel.decision;

import app.keel.nutrition.DailyTargets;
import app.keel.shared.AccountId;
import java.time.LocalDate;
import java.util.Optional;
import org.springframework.stereotype.Component;

/**
 * The food budget's targets (K-209's DailyTargets), set by calls (K-216): nutrition asks through its own interface and
 * decision answers, so the dependency stays one way. The targets in force now: a past day's budget is read against
 * today's target, not the one in force that day (the call ledger keeps when each changed).
 */
@Component
class PlanDailyTargets implements DailyTargets {

    private final DecisionService decisions;

    PlanDailyTargets(DecisionService decisions) {
        this.decisions = decisions;
    }

    @Override
    public Optional<Targets> forDay(AccountId account, LocalDate day) {
        return decisions.targetsNow(account).map(targets -> new Targets(targets.targetKcal(), targets.proteinG()));
    }
}
