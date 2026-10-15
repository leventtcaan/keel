package app.keel.subscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.keel.shared.AccountId;
import app.keel.shared.RevenueCatSubscribers;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

/**
 * What one webhook may cause in REST asks (K-704): a capped number of accounts, and no new ask once the deadline since the
 * first has passed. No database, no network: the REST API is a stand-in that takes a set time per ask on a clock of ours.
 */
class RevenueCatRefreshBudgetTests {

    /** A clock that only moves when an ask "takes time". */
    static final class Moving extends Clock {

        private Instant now = Instant.parse("2026-10-15T10:00:00Z");

        void pass(Duration time) {
            now = now.plus(time);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    private static List<AccountId> accounts(int count) {
        return IntStream.range(0, count).mapToObj(i -> new AccountId(UUID.randomUUID())).toList();
    }

    private static RevenueCatRefresh refresh(Moving clock, Duration perAsk, List<AccountId> asked, int max, Duration deadline) {
        RevenueCatSubscribers rest = account -> {
            asked.add(account);
            clock.pass(perAsk);
            return Optional.empty();
        };
        return new RevenueCatRefresh(rest, null, null, new RevenueCatRefreshProperties(max, deadline), clock);
    }

    @Test
    void aTransferNamingManyAccountsAsksOnlyTheFirstFew() {
        List<AccountId> asked = new ArrayList<>();
        Moving clock = new Moving();

        refresh(clock, Duration.ofMillis(10), asked, 10, Duration.ofSeconds(30)).afterWebhook(accounts(25));

        assertThat(asked).hasSize(10);
    }

    @Test
    void noNewAskIsStartedOnceTheDeadlineSinceTheFirstHasPassed() {
        List<AccountId> asked = new ArrayList<>();
        Moving clock = new Moving();

        // 20 s per ask, a 30 s deadline: the asks at 0 s and 20 s start, the one at 40 s does not.
        refresh(clock, Duration.ofSeconds(20), asked, 10, Duration.ofSeconds(30)).afterWebhook(accounts(5));

        assertThat(asked).hasSize(2);
    }

    @Test
    void theBudgetMustBeSomething() {
        assertThatThrownBy(() -> new RevenueCatRefreshProperties(0, Duration.ofSeconds(1))).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new RevenueCatRefreshProperties(1, Duration.ZERO)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new RevenueCatRefreshProperties(null, null)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void anAskThatFailsDoesNotStopTheRestOfTheList() {
        List<AccountId> asked = new ArrayList<>();
        Moving clock = new Moving();
        RevenueCatSubscribers rest = account -> {
            asked.add(account);
            throw new IllegalStateException("down");
        };

        new RevenueCatRefresh(rest, null, null, new RevenueCatRefreshProperties(10, Duration.ofSeconds(30)), clock).afterWebhook(accounts(3));

        assertThat(asked).hasSize(3);
        assertThat(Set.copyOf(asked)).hasSize(3);
    }
}
