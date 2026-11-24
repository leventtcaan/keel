package app.keel.coach;

import app.keel.shared.AccountId;
import java.math.BigDecimal;
import java.time.LocalDate;

/** What the model has cost for one account in a month (ADR-092 #4): the cap per account reads it. */
interface AccountSpend {

    BigDecimal spent(AccountId account, LocalDate month);

    void add(AccountId account, LocalDate month, BigDecimal costUsd);
}
