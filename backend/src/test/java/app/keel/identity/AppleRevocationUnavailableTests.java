package app.keel.identity;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import tools.jackson.databind.json.JsonMapper;

/**
 * Without the developer account's key (development, a server not set up): revocation is unavailable, said as such, and
 * the account is deleted all the same (K-812, ADR-062, V6). The settings are emptied here, so a developer's own key in the
 * environment does not turn this test.
 */
@SpringBootTest(properties = {"keel.apple.revocation.team-id=", "keel.apple.revocation.key-id=", "keel.apple.revocation.private-key="})
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class AppleRevocationUnavailableTests {

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    AppleAccounts apple;

    @Test
    void unavailableThenTheDeletionGoesOn() {
        AccountId account = TestSessions.newAccount();
        String bearer = TestSessions.bearer(context, account);
        assertThat(apple.revocationConfigured()).isFalse();

        assertThat(mvc.post().uri("/v1/account/apple-revocation").header("Authorization", bearer).contentType(MediaType.APPLICATION_JSON)
                .content(JsonMapper.builder().build().writeValueAsString(Map.of("authorizationCode", "a-code"))).exchange()).hasStatus(503);
        assertThat(mvc.delete().uri("/v1/account").header("Authorization", bearer).exchange()).hasStatus(202);
    }
}
