package app.keel.coach;

import app.keel.shared.AccountId;
import app.keel.subscription.CoachAccountSpend;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.stereotype.Component;

/** {@link AccountSpend} in subscription.coach_account_spend: kept with the subscription's counts, gone with the account. */
@Component
class SubscriptionAccountSpend implements AccountSpend {

    private final CoachAccountSpend spend;

    SubscriptionAccountSpend(CoachAccountSpend spend) {
        this.spend = spend;
    }

    @Override
    public BigDecimal spent(AccountId account, LocalDate month) {
        return spend.spent(account, month);
    }

    @Override
    public void add(AccountId account, LocalDate month, BigDecimal costUsd) {
        spend.add(account, month, costUsd);
    }
}
