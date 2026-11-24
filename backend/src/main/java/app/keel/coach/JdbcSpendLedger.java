package app.keel.coach;

import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/** {@link SpendLedger} in coach.model_spend: one row a month, counted in one statement. */
@Component
class JdbcSpendLedger implements SpendLedger {

    private final JdbcClient jdbc;

    JdbcSpendLedger(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public BigDecimal spent(LocalDate month) {
        return jdbc.sql("select cost_usd from coach.model_spend where month = :month").param("month", month).query(BigDecimal.class).optional()
                .orElse(BigDecimal.ZERO);
    }

    @Override
    public void add(LocalDate month, int inputTokens, int outputTokens, BigDecimal costUsd) {
        jdbc.sql("""
                insert into coach.model_spend (month, calls, input_tokens, output_tokens, cost_usd) values (:month, 1, :in, :out, :cost)
                on conflict (month) do update set calls = coach.model_spend.calls + 1,
                    input_tokens = coach.model_spend.input_tokens + :in, output_tokens = coach.model_spend.output_tokens + :out,
                    cost_usd = coach.model_spend.cost_usd + :cost""")
                .param("month", month).param("in", inputTokens).param("out", outputTokens).param("cost", costUsd).update();
    }
}
