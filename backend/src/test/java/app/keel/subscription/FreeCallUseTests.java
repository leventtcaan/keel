package app.keel.subscription;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * The free full calls an account has spent (ADR-091 Ek 1, K-1201): kept in the subscription module, not with the health data,
 * so wiping the calls does not renew the allowance; gone only with the account.
 */
@SpringBootTest
@Import(PostgresTestConfiguration.class)
class FreeCallUseTests {

    @Autowired
    FreeCallUse uses;

    @Autowired
    JdbcClient jdbc;

    @Test
    void itCountsWhatIsRecorded() {
        AccountId account = TestSessions.newAccount();

        assertThat(uses.used(account)).isZero();
        uses.record(account);
        uses.record(account);

        assertThat(uses.used(account)).isEqualTo(2);
        assertThat(uses.used(TestSessions.newAccount())).as("someone else's").isZero();
    }

    // That it goes with the account: AccountDataTests, whose fixture records one and which asks every module's table to be empty.
}
