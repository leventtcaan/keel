package app.keel.identity;

import app.keel.shared.AccountId;
import java.time.Clock;
import java.time.ZoneOffset;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Accounts by Apple's user id (K-203). */
@Repository
class Accounts {

    record SignedIn(AccountId account, boolean created) {
    }

    private final JdbcClient jdbc;
    private final Clock clock;

    Accounts(JdbcClient jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    /** The account of this Apple user, created on the first sign-in; two first sign-ins at once make one account. */
    SignedIn findOrCreate(AppleIdentity apple) {
        int created = jdbc.sql("""
                insert into identity.account (id, apple_subject, created_at) values (:id, :subject, :now)
                on conflict (apple_subject) do nothing""")
                .param("id", UUID.randomUUID()).param("subject", apple.subject()).param("now", clock.instant().atOffset(ZoneOffset.UTC))
                .update();
        UUID id = jdbc.sql("select id from identity.account where apple_subject = :subject")
                .param("subject", apple.subject()).query(UUID.class).single();
        return new SignedIn(new AccountId(id), created == 1);
    }
}
