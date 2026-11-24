package app.keel.coach;

import app.keel.shared.AccountId;
import app.keel.shared.ErrorCode;
import app.keel.shared.SafeLog;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * What the coach's language model costs and the monthly budget (ADR-092 #4): every call is recorded — its tokens times the
 * prices keel.coach states, or, while they are not known, the high estimate of coach.yaml, never nothing — and once the month
 * has cost the budget, the coach speaks in the engine's words for everyone until the month turns (UTC). Nothing of what was
 * asked is kept: counts and money only (V3).
 */
@Component
class CoachSpend {

    private final SpendLedger ledger;
    private final AccountSpend accounts;
    private final CoachProperties properties;
    private final CoachLimits limits;
    private final Clock clock;

    CoachSpend(SpendLedger ledger, AccountSpend accounts, CoachProperties properties, CoachLimits limits, Clock clock) {
        this.ledger = ledger;
        this.accounts = accounts;
        this.properties = properties;
        this.limits = limits;
        this.clock = clock;
    }

    /** What a call cost: its tokens at the prices, or the high estimate while they are not set. */
    BigDecimal costOf(ModelReply reply) {
        return properties.priced() ? properties.cost(reply) : limits.unpricedCallCostUsd();
    }

    /**
     * Counted after the model answered: a ledger that cannot be written is logged (by type and place, V3) and the answer the
     * user waited for is not lost to it.
     */
    void record(AccountId account, ModelReply reply) {
        write(account, reply.inputTokens(), reply.outputTokens(), costOf(reply));
    }

    /**
     * A call that went out and did not come back in a way that could be used (a timeout, a 5xx, a refusal): it may still have been
     * charged, so it counts at the high estimate of coach.yaml (the provider's own bill is the truth; this keeps the budget from
     * being blind to a provider that charges and fails).
     */
    void recordFailed(AccountId account) {
        write(account, 0, 0, limits.unpricedCallCostUsd());
    }

    private void write(AccountId account, int inputTokens, int outputTokens, BigDecimal cost) {
        try {
            ledger.add(month(), inputTokens, outputTokens, cost);
            accounts.add(account, month(), cost);
        } catch (RuntimeException notCounted) {
            SafeLog.failure(UUID.randomUUID(), ErrorCode.INTERNAL, notCounted);
        }
    }

    /**
     * Whether this account's questions may go to the model now: neither the month's budget for everyone nor this account's own cap is
     * spent; otherwise the coach answers in the engine's words. A soft limit: the check and the recording are two steps, so requests
     * at the same moment may each pass it and the month ends a few calls over (a call costs a fraction of a cent). The OpenAI project's
     * own budget is the hard stop.
     */
    boolean exhausted(AccountId account) {
        return exhausted() || accounts.spent(account, month()).compareTo(limits.monthlyCapPerAccountUsd()) >= 0;
    }

    /** Whether the month has cost the budget for everyone: the coach then answers in the engine's words. */
    boolean exhausted() {
        return ledger.spent(month()).compareTo(limits.monthlyBudgetUsd()) >= 0;
    }

    private LocalDate month() {
        return LocalDate.now(clock.withZone(ZoneOffset.UTC)).withDayOfMonth(1);
    }
}
