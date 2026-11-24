package app.keel.coach;

import app.keel.shared.ErrorCode;
import app.keel.shared.SafeLog;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
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
    private final CoachProperties properties;
    private final CoachLimits limits;
    private final Clock clock;

    @Autowired
    CoachSpend(SpendLedger ledger, CoachProperties properties, Clock clock) {
        this(ledger, properties, CoachLimits.fromClasspath(), clock);
    }

    CoachSpend(SpendLedger ledger, CoachProperties properties, CoachLimits limits, Clock clock) {
        this.ledger = ledger;
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
    void record(ModelReply reply) {
        try {
            ledger.add(month(), reply.inputTokens(), reply.outputTokens(), costOf(reply));
        } catch (RuntimeException notCounted) {
            SafeLog.failure(UUID.randomUUID(), ErrorCode.INTERNAL, notCounted);
        }
    }

    /** Whether the month has cost the budget: the coach then answers in the engine's words. */
    boolean exhausted() {
        return ledger.spent(month()).compareTo(limits.monthlyBudgetUsd()) >= 0;
    }

    private LocalDate month() {
        return LocalDate.now(clock.withZone(ZoneOffset.UTC)).withDayOfMonth(1);
    }
}
