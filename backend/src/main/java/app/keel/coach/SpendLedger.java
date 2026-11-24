package app.keel.coach;

import java.math.BigDecimal;
import java.time.LocalDate;

/** What the model has cost, by month: the whole server's, no account (ADR-092 #4). */
interface SpendLedger {

    /** What the month (its first day) has cost so far. */
    BigDecimal spent(LocalDate month);

    /** One more call in the month, with its tokens and cost. */
    void add(LocalDate month, int inputTokens, int outputTokens, BigDecimal costUsd);
}
