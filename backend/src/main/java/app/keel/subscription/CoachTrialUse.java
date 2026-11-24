package app.keel.subscription;

import app.keel.shared.AccountId;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * The introductory coach questions an account without a subscription has asked (ADR-092 #7, ADR-091 yükseltme anı b): a count, kept
 * here with the subscription and not with the conversation — clearing the conversation or withdrawing a consent must not give a
 * question back. The limit is the coach's (coach_free_trial_questions); gone only with the account.
 */
@Service
public class CoachTrialUse {

    private final JdbcClient jdbc;

    CoachTrialUse(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public int used(AccountId account) {
        return jdbc.sql("select used from subscription.coach_trial_use where account_id = :account").param("account", account.value()).query(Integer.class)
                .optional().orElse(0);
    }

    /** One more question, if fewer than {@code limit} were asked: counted in one statement, so requests at the same moment never take more. */
    public boolean take(AccountId account, int limit) {
        if (limit < 1) {
            return false;
        }
        Optional<Integer> taken = jdbc.sql("""
                insert into subscription.coach_trial_use (account_id, used) values (:account, 1)
                on conflict (account_id) do update set used = subscription.coach_trial_use.used + 1 where subscription.coach_trial_use.used < :limit
                returning used""").param("account", account.value()).param("limit", limit).query(Integer.class).optional();
        return taken.isPresent();
    }

    /** A question taken for an answer that never came: given back, never below none. */
    public void giveBack(AccountId account) {
        jdbc.sql("update subscription.coach_trial_use set used = used - 1 where account_id = :account and used > 0").param("account", account.value()).update();
    }
}
