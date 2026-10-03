package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * Every call to a language model goes out through the privacy module's gate (K-503, K-214, V2): without the AI consent
 * that names the provider the call never runs; with it, the model gets the request with the configured model and output
 * limit, and its reply comes back.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Import(PostgresTestConfiguration.class)
class CoachModelTests {

    @Autowired
    CoachModel coach;

    @Autowired
    LanguageModel model;

    @Autowired
    JdbcClient jdbc;

    private FakeLanguageModel fake;

    @BeforeEach
    void forget() {
        fake = (FakeLanguageModel) model;
        fake.forget();
    }

    @Test
    void withoutTheAiConsentTheModelIsNeverCalled() {
        AccountId account = TestSessions.newAccount();
        fake.answer("{\"text\":\"hello\"}");

        assertThatThrownBy(() -> coach.ask(account, "explain", "system words", List.of(Turn.user("why?"))))
                .isInstanceOfSatisfying(ApiException.class, refused -> assertThat(refused.code()).isEqualTo(ErrorCode.CONSENT_REQUIRED));
        assertThat(fake.requests()).isEmpty();
    }

    @Test
    void withItTheModelGetsTheConfiguredRequestAndItsReplyComesBack() {
        AccountId account = TestSessions.newAccount();
        jdbc.sql("""
                insert into consent.consent_event (id, account_id, kind, action, text_version, provider, data_types, occurred_at)
                values (gen_random_uuid(), :account, 'THIRD_PARTY_AI', 'GRANTED', :version, 'Example AI', :types, now())""")
                .param("account", account.value()).param("version", ConsentTextVersions.THIRD_PARTY_AI)
                .param("types", new String[] {"meal photo", "meal note"}).update();
        fake.answer("{\"text\":\"hello\"}");

        ModelReply reply = coach.ask(account, "explain", "system words", List.of(Turn.user("why?")));

        assertThat(reply.text()).isEqualTo("{\"text\":\"hello\"}");
        assertThat(fake.requests()).singleElement().satisfies(request -> {
            assertThat(request.model()).isEqualTo("test-model");
            assertThat(request.maxOutputTokens()).isEqualTo(300);
            assertThat(request.purpose()).isEqualTo("explain");
            assertThat(request.system()).isEqualTo("system words");
            assertThat(request.turns()).containsExactly(Turn.user("why?"));
        });
    }
}
