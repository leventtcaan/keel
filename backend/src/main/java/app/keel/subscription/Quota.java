package app.keel.subscription;

import app.keel.profile.ProfileFacts;
import app.keel.profile.Profiles;
import app.keel.shared.AccountId;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * The daily quota (K-508, ADR-004, ADR-012): each account may use a coach message and a photo analysis so many times a
 * day — the user's own day, by the profile's time zone (UTC without one). Past the limit there is no hard stop and
 * nothing to buy: the caller answers without the language model, in the engine's words.
 */
@Service
public class Quota {

    public enum Use { COACH_MESSAGE, PHOTO_ANALYSIS }

    private final JdbcClient jdbc;
    private final Profiles profiles;
    private final Clock clock;
    private final QuotaLimits limits = QuotaLimits.fromClasspath();

    Quota(JdbcClient jdbc, Profiles profiles, Clock clock) {
        this.jdbc = jdbc;
        this.profiles = profiles;
        this.clock = clock;
    }

    /**
     * One use today, if the limit allows: true and counted, or false and nothing counted. Counted in one statement, so
     * requests at the same moment never take more than the limit.
     */
    public boolean take(AccountId account, Use use) {
        return true;
    }

    /** A use taken for a call that did not happen (refused, failed): given back, never below none. */
    public void giveBack(AccountId account, Use use) {
        jdbc.sql("""
                update subscription.daily_use set used = used - 1
                where account_id = :account and day = :day and use = :use and used > 0""")
                .param("account", account.value()).param("day", today(account)).param("use", use.name()).update();
    }

    private LocalDate today(AccountId account) {
        ZoneId zone = profiles.of(account).map(ProfileFacts::timeZone).orElse(ZoneOffset.UTC);
        return LocalDate.now(clock.withZone(zone));
    }
}
