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
        context.getBean(JdbcClient.class).sql("""
                insert into identity.account (id, apple_subject, created_at) values (:id, :subject, now()) on conflict (id) do nothing""")
                .param("id", account.value()).param("subject", "test." + account.value()).update();
        return "Bearer " + context.getBean(SessionTokens.class).issue(account).token();
    }
}
