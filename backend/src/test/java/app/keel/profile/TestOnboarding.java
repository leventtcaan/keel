package app.keel.profile;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.shared.AccountId;
import org.springframework.context.ApplicationContext;
import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * For other modules' web tests: when onboarding finished (K-990, ADR-077 Ek 2). The first call is not offered before the
 * first check-in day after it, so a test that checks in on the day it saved the profile moves that moment back first.
 */
public final class TestOnboarding {

    /**
     * Two weeks back: the first call's day has passed whatever the check-in day, and this week's check-in is not the one
     * that closes the first week (K-962) — as for an account a week or more into its plan.
     */
    private static final int DAYS_BACK = 14;

    private TestOnboarding() {
    }

    /** The profile, saved already, was saved two weeks ago. */
    public static void finishedTwoWeeksAgo(ApplicationContext context, AccountId account) {
        assertThat(context.getBean(JdbcClient.class).sql("update profile.profile set onboarded_at = now() - make_interval(hours => :hours) where account_id = :a")
                .param("hours", DAYS_BACK * 24).param("a", account.value()).update()).as("a profile to move back").isEqualTo(1);
    }
}
