package app.keel.measurement;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;

/** The reference look (K-224, contract /v1/body-looks): a level, health data, kept once per client id, never a percent. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class BodyLookApiTests {

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    private MeasurementTestSupport support;

    @BeforeEach
    void support() {
        support = new MeasurementTestSupport(mvc, context);
    }

    @Test
    void aLookIsKeptOnceAndGivenBackAsItsLevel() throws Exception {
        AccountId account = support.consentingAccount();
        Map<String, Object> look = Map.of("clientId", UUID.randomUUID(), "takenOn", "2026-09-30", "level", 3);

        MvcTestResult first = support.send(account, "POST", "/v1/body-looks", look);
        MvcTestResult again = support.send(account, "POST", "/v1/body-looks", look);

        assertThat(first).hasStatus(201);
        assertThat(again).hasStatus(200);
        assertThat(MeasurementTestSupport.map(first)).containsEntry("level", 3).containsEntry("takenOn", "2026-09-30").containsKey("id")
                .doesNotContainKeys("pct", "fatProxyPct", "percent");
    }

    @Test
    void aLevelOutsideTheLooksIsRefusedAndTheLookIsHealthData() {
        AccountId account = support.consentingAccount();
        for (int level : new int[] {0, 8}) {
            assertThat(support.send(account, "POST", "/v1/body-looks", Map.of("clientId", UUID.randomUUID(), "takenOn", "2026-09-30", "level", level)))
                    .as("level " + level).hasStatus(400);
        }
        assertThat(support.send(TestSessions.newAccount(), "POST", "/v1/body-looks", Map.of("clientId", UUID.randomUUID(), "takenOn", "2026-09-30",
                "level", 3))).hasStatus(403);
    }
}
