package app.keel.identity;

import app.keel.shared.AccountId;
import java.util.UUID;
import org.springframework.context.ApplicationContext;

/**
 * For other modules' web tests: a Bearer header for an account, signed by the application's own session key — as if
 * that account had signed in. Modules keep no foreign key to identity (ADR-023), so any fresh id is a valid account.
 */
public final class TestSessions {

    private TestSessions() {
    }

    public static AccountId newAccount() {
        return new AccountId(UUID.randomUUID());
    }

    public static String bearer(ApplicationContext context, AccountId account) {
        return "Bearer " + context.getBean(SessionTokens.class).issue(account).token();
    }
}
