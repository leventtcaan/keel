package app.keel.subscription;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.shared.AccountId;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * Whether the subscription is active is the server's clock against accessUntil (K-705, ADR-056 #5) — the clock it is
 * given, not the wall's: the API tests run on the real clock, so they cannot tell the two apart; this one, years back, can.
 */
class SubscriptionControllerTests {

    private static final Instant T = Instant.parse("2020-03-01T12:00:00Z");
    private static final AccountId ACCOUNT = new AccountId(UUID.fromString("0b6f2a8e-1c3d-4e5f-8a9b-0c1d2e3f4a5b"));

    /** The kept state, without a database. */
    private static Subscriptions keeping(Optional<SubscriptionState> state) {
        return new Subscriptions(null, null, null) {
            @Override
            Optional<SubscriptionState> kept(AccountId account) {
                return account.equals(ACCOUNT) ? state : Optional.empty();
            }
        };
    }

    private static SubscriptionController.SubscriptionView read(Optional<SubscriptionState> state) {
        return new SubscriptionController(keeping(state), Clock.fixed(T, ZoneOffset.UTC)).read(ACCOUNT);
    }

    @Test
    void activeUntilTheLastMomentOfAccessByTheServersClock() {
        SubscriptionState.Status status = SubscriptionState.Status.ACTIVE;
        assertThat(read(Optional.of(new SubscriptionState(status, T.plusMillis(1), T.minusSeconds(60)))).active()).isTrue();
        assertThat(read(Optional.of(new SubscriptionState(status, T, T.minusSeconds(60)))).active()).as("access ends at accessUntil").isFalse();
    }

    @Test
    void theStatusAndItsEndAreAsKeptWithTheAccountsOwnId() {
        SubscriptionState trial = new SubscriptionState(SubscriptionState.Status.TRIAL, T.plusSeconds(7 * 86_400), T);
        assertThat(read(Optional.of(trial)))
                .isEqualTo(new SubscriptionController.SubscriptionView(true, ACCOUNT.value(), SubscriptionState.Status.TRIAL, trial.accessUntil()));
    }

    @Test
    void neverSubscribedIsInactiveWithTheIdToBuyUnder() {
        assertThat(read(Optional.empty())).isEqualTo(new SubscriptionController.SubscriptionView(false, ACCOUNT.value(), null, null));
    }
}
