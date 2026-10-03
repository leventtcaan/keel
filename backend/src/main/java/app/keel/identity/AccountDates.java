package app.keel.identity;

import app.keel.shared.AccountId;
import java.time.Instant;
import java.time.OffsetDateTime;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/** When an account began: day one of its first week (K-513, ADR-040). The module's only date other modules read. */
@Component
public class AccountDates {

    private final JdbcClient jdbc;

    AccountDates(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** The moment the account was made, on the first sign-in; a signed-in account always has one. */
    public Instant began(AccountId account) {
        return jdbc.sql("select created_at from identity.account where id = :id").param("id", account.value())
                .query((row, n) -> row.getObject("created_at", OffsetDateTime.class).toInstant()).single();
    }
}
