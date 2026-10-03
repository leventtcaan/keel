package app.keel.privacy;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.keel.consent.ConsentGate;
import app.keel.consent.ConsentKind;
import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * Everything that leaves the server for someone else goes through one gate (K-214, V2): data for a third-party AI only
 * with the consent that names it, checked at the moment of sending; the call does not happen otherwise.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Import(PostgresTestConfiguration.class)
class EgressGateTests {

    @Autowired
    EgressGate egress;

    @Autowired
    ConsentGate consents;

    @Autowired
    JdbcClient jdbc;

    @Test
    void withoutTheAiConsentNothingIsSentAndTheCallNeverRuns() {
        AccountId account = TestSessions.newAccount();
        AtomicBoolean called = new AtomicBoolean();

        assertThatThrownBy(() -> egress.sendToAi(account, "Example AI", "coach question", () -> {
            called.set(true);
            return "reply";
        })).isInstanceOfSatisfying(ApiException.class, refused -> assertThat(refused.code()).isEqualTo(ErrorCode.CONSENT_REQUIRED));
        assertThat(called).isFalse();
    }

    @Test
    void withTheConsentTheCallRunsAndItsAnswerComesBack() {
        AccountId account = TestSessions.newAccount();
        jdbc.sql("""
                insert into consent.consent_event (id, account_id, kind, action, text_version, provider, data_types, occurred_at)
                values (gen_random_uuid(), :account, 'THIRD_PARTY_AI', 'GRANTED', :version, 'Example AI', :types, now())""")
                .param("account", account.value()).param("version", ConsentTextVersions.THIRD_PARTY_AI).param("types", new String[] {"meal photo", "meal note", "coach question"}).update();
        assertThat(consents.granted(account, ConsentKind.THIRD_PARTY_AI)).isTrue();

        assertThat(egress.sendToAi(account, "Example AI", "coach question", () -> "reply")).isEqualTo("reply");
        // K-503: to another provider than the one the user agreed to, nothing is sent and the call never runs.
        AtomicBoolean called = new AtomicBoolean();
        assertThatThrownBy(() -> egress.sendToAi(account, "Other AI", "coach question", () -> {
            called.set(true);
            return "reply";
        })).isInstanceOfSatisfying(ApiException.class, refused -> assertThat(refused.code()).isEqualTo(ErrorCode.CONSENT_REQUIRED));
        assertThat(called).isFalse();
        // K-505: data the consent does not name is not sent either.
        assertThatThrownBy(() -> egress.sendToAi(account, "Example AI", "location", () -> {
            called.set(true);
            return "reply";
        })).isInstanceOfSatisfying(ApiException.class, refused -> assertThat(refused.code()).isEqualTo(ErrorCode.CONSENT_REQUIRED));
        assertThat(called).isFalse();
    }

    @Test
    void aCallToAnAiNamesItsProvider() {
        // The plain send cannot carry data to an AI: the provider would go unchecked (K-503).
        assertThatThrownBy(() -> egress.send(TestSessions.newAccount(), EgressGate.Destination.THIRD_PARTY_AI, () -> "reply"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void accountHousekeepingWithAppleNeedsNoAiConsent() {
        // Revoking Apple's tokens when an account is deleted carries no health data; it is the user's own request.
        assertThat(egress.send(TestSessions.newAccount(), EgressGate.Destination.APPLE_ACCOUNT, () -> "revoked")).isEqualTo("revoked");
    }
}
