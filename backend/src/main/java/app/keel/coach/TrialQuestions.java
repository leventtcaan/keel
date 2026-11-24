package app.keel.coach;

import app.keel.shared.AccountId;
import app.keel.subscription.CoachTrialUse;
import org.springframework.stereotype.Component;

/**
 * The introductory questions of an account without a subscription (ADR-092 #7, ADR-091 yükseltme anı b): {@code coach_free_trial_questions},
 * once in its life, on the first full call it may read (a locked call is never the coach's to tell, CallReader). The count is kept
 * with the subscription (CoachTrialUse), so clearing the conversation or withdrawing a consent gives none back.
 */
@Component
class TrialQuestions {

    private final CoachTrialUse uses;
    private final CoachLimits limits;

    TrialQuestions(CoachTrialUse uses, CoachLimits limits) {
        this.uses = uses;
        this.limits = limits;
    }

    /** How many are left. */
    int left(AccountId account) {
        return Math.max(0, limits.freeTrialQuestions() - uses.used(account));
    }

    /** One taken, if any is left. */
    boolean take(AccountId account) {
        return uses.take(account, limits.freeTrialQuestions());
    }

    /** A question taken for an answer that never came (the provider failed). */
    void giveBack(AccountId account) {
        uses.giveBack(account);
    }
}
