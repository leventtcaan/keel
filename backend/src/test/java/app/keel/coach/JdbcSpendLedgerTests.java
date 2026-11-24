package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.persistence.PostgresTestConfiguration;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;

/** The month's spend as the database keeps it (ADR-092 #4): one row a month, added to in one statement, no account in it. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Import(PostgresTestConfiguration.class)
class JdbcSpendLedgerTests {

    private static final LocalDate DECEMBER = LocalDate.of(2031, 12, 1);

    @Autowired
    SpendLedger ledger;

    @Autowired
    JdbcClient jdbc;

    @BeforeEach
    void clear() {
        jdbc.sql("delete from coach.model_spend where month >= :from").param("from", LocalDate.of(2031, 1, 1)).update();
    }

    @Test
    void aMonthWithNothingSpentCostsNothing() {
        assertThat(ledger.spent(DECEMBER)).isEqualByComparingTo("0");
    }

    @Test
    void everyCallIsAddedToItsMonthsRow() {
        ledger.add(DECEMBER, 288, 65, new BigDecimal("0.000040"));
        ledger.add(DECEMBER, 100, 20, new BigDecimal("0.000018"));
        ledger.add(DECEMBER.plusMonths(1), 1, 1, new BigDecimal("5"));

        assertThat(ledger.spent(DECEMBER)).isEqualByComparingTo("0.000058");
        assertThat(jdbc.sql("select calls, input_tokens, output_tokens from coach.model_spend where month = :m").param("m", DECEMBER)
                .query((rs, row) -> rs.getInt(1) + "/" + rs.getLong(2) + "/" + rs.getLong(3)).single()).isEqualTo("2/388/85");
        assertThat(ledger.spent(DECEMBER.plusMonths(1))).isEqualByComparingTo("5");
    }
}
