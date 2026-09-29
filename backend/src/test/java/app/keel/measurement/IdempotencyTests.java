package app.keel.measurement;

import static app.keel.measurement.MeasurementTestSupport.list;
import static app.keel.measurement.MeasurementTestSupport.map;
import static org.assertj.core.api.Assertions.assertThat;

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

/**
 * Offline-first (ADR-006, ADR-024): the phone may send the same record twice when a response is lost. The clientId it
 * made stores the record once; the repeat answers 200 with the stored record. Two accounts may use the same clientId.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class IdempotencyTests {

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    MeasurementTestSupport support;

    @BeforeEach
    void setUp() {
        support = new MeasurementTestSupport(mvc, context);
    }

    @Test
    void aWeighInSentTwiceIsStoredOnce() throws Exception {
        AccountId account = support.consentingAccount();
        Map<String, Object> weighIn = MeasurementApiTests.weighIn("2026-09-30T05:00:00Z", 82.4);

        MvcTestResult first = support.send(account, "POST", "/v1/weigh-ins", weighIn);
        MvcTestResult again = support.send(account, "POST", "/v1/weigh-ins", weighIn);

        assertThat(first).hasStatus(201);
        assertThat(again).hasStatus(200);
        assertThat(map(again)).isEqualTo(map(first));
        assertThat(list(support.get(account, "/v1/weigh-ins?from=2026-09-30&to=2026-09-30"))).hasSize(1);
    }

    @Test
    void aRepeatReturnsTheStoredRecordEvenIfTheBodyChanged() throws Exception {
        // The first write wins: a retry is the same record; a different body under the same clientId is not a change.
        AccountId account = support.consentingAccount();
        UUID clientId = UUID.randomUUID();
        support.send(account, "POST", "/v1/weigh-ins", Map.of("clientId", clientId, "measuredAt", "2026-09-30T05:00:00Z", "kg", 82.4,
                "source", "MANUAL"));

        MvcTestResult again = support.send(account, "POST", "/v1/weigh-ins", Map.of("clientId", clientId,
                "measuredAt", "2026-09-30T05:00:00Z", "kg", 90.0, "source", "MANUAL"));

        assertThat(again).hasStatus(200);
        assertThat(map(again)).containsEntry("kg", 82.4);
    }

    @Test
    void waistAndPhotoChecksAreIdempotentToo() {
        AccountId account = support.consentingAccount();
        Map<String, Object> waist = MeasurementApiTests.waist("2026-09-30", 88);
        Map<String, Object> photo = Map.of("clientId", UUID.randomUUID(), "takenOn", "2026-09-30", "look", "SAME");

        assertThat(support.send(account, "POST", "/v1/waist-measurements", waist)).hasStatus(201);
        assertThat(support.send(account, "POST", "/v1/waist-measurements", waist)).hasStatus(200);
        assertThat(support.send(account, "POST", "/v1/photo-checks", photo)).hasStatus(201);
        assertThat(support.send(account, "POST", "/v1/photo-checks", photo)).hasStatus(200);
    }

    @Test
    void twoAccountsMayUseTheSameClientId() {
        Map<String, Object> weighIn = MeasurementApiTests.weighIn("2026-09-30T05:00:00Z", 82.4);

        assertThat(support.send(support.consentingAccount(), "POST", "/v1/weigh-ins", weighIn)).hasStatus(201);
        assertThat(support.send(support.consentingAccount(), "POST", "/v1/weigh-ins", weighIn)).hasStatus(201);
    }
}
