package app.keel.identity;

import app.keel.shared.AccountId;
import java.util.UUID;
import org.springframework.context.ApplicationContext;
import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * For other modules' web tests: a Bearer header for an account, signed by the application's own session key — as if
 * that account had signed in. A token is honoured only while its account exists (K-214), so the account row is made
 * here if it is missing; a test that deletes the account takes its header first and keeps using that one.
 */
public final class TestSessions {

    private TestSessions() {
    }

    public static AccountId newAccount() {
        return new AccountId(UUID.randomUUID());
    }

    public static String bearer(ApplicationContext context, AccountId account) {
        // No conflict target: two threads making the same account at once (a concurrency test) collide on apple_subject
        // too, and Postgres raises a unique violation on any index that is not the ON CONFLICT target.
        context.getBean(JdbcClient.class).sql("""
                insert into identity.account (id, apple_subject, created_at) values (:id, :subject, now()) on conflict do nothing""")
                .param("id", account.value()).param("subject", "test." + account.value()).update();
        return "Bearer " + context.getBean(SessionTokens.class).issue(account).token();
    }

    /** A refresh token of the account's, as a sign-in would give the phone; the account must exist. */
    public static String refreshToken(ApplicationContext context, AccountId account) {
        return context.getBean(RefreshTokens.class).start(account);
    }
}
