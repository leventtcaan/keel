package app.keel.subscription;

import app.keel.shared.AccountId;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * What the coach's model has cost for one account in a month (ADR-092 #4): the cap per account (coach_monthly_cap_per_account_usd) reads
 * it. Money only, kept with the subscription like the other counts, gone with the account. Rows of months before last are removed as
 * a new one is added.
 */
@Service
public class CoachAccountSpend {

    private final JdbcClient jdbc;

    CoachAccountSpend(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public BigDecimal spent(AccountId account, LocalDate month) {
        return jdbc.sql("select cost_usd from subscription.coach_account_spend where account_id = :account and month = :month")
                .param("account", account.value()).param("month", month).query(BigDecimal.class).optional().orElse(BigDecimal.ZERO);
    }

    public void add(AccountId account, LocalDate month, BigDecimal costUsd) {
        jdbc.sql("""
                insert into subscription.coach_account_spend (account_id, month, cost_usd) values (:account, :month, :cost)
                on conflict (account_id, month) do update set cost_usd = subscription.coach_account_spend.cost_usd + :cost""")
                .param("account", account.value()).param("month", month).param("cost", costUsd).update();
        jdbc.sql("delete from subscription.coach_account_spend where account_id = :account and month < :oldest")
                .param("account", account.value()).param("oldest", month.minusMonths(1)).update();
    }

    /** Every month kept, for the export (V6). */
    public java.util.List<java.util.Map<String, Object>> all(AccountId account) {
        return jdbc.sql("select month, cost_usd from subscription.coach_account_spend where account_id = :account order by month")
                .param("account", account.value()).query((row, n) -> {
                    java.util.Map<String, Object> entry = new java.util.LinkedHashMap<>();
                    entry.put("month", row.getObject("month", LocalDate.class).toString());
                    entry.put("costUsd", row.getBigDecimal("cost_usd"));
                    return entry;
                }).list();
    }
}
