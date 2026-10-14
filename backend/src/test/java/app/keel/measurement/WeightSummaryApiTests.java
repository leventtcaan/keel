package app.keel.measurement;

import static app.keel.measurement.MeasurementTestSupport.list;
import static app.keel.measurement.MeasurementTestSupport.map;
import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
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

/**
 * GET /v1/weigh-ins/summary (K-1018, ADR-078 Ek 2): the newest weigh-in, the days that have one and whether the trend is
 * ready, for the weigh screen's "Last" and the progress screen's "3 of 7". Health data: the consent is checked on the call.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class WeightSummaryApiTests {

    private static final String SUMMARY = "/v1/weigh-ins/summary";
    private static final ZoneId ISTANBUL = ZoneId.of("Europe/Istanbul");
    private static final LocalDate DAY_1 = LocalDate.of(2026, 9, 1);

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
    void withoutTheHealthDataConsentItIsRefused() {
        AccountId account = TestSessions.newAccount();

        assertThat(support.get(account, SUMMARY)).hasStatus(403).bodyJson().extractingPath("$.code").isEqualTo("CONSENT_REQUIRED");
    }

    @Test
    void beforeTheFirstWeighInThereIsNoLastAndTheTrendIsNotReady() throws Exception {
        AccountId account = support.consentingAccount();

        Map<String, Object> summary = map(support.get(account, SUMMARY));

        assertThat(summary).containsOnlyKeys("weighInCount", "trendMinWeighIns", "trendReady")
                .containsEntry("weighInCount", 0).containsEntry("trendMinWeighIns", 7).containsEntry("trendReady", false);
    }

    @Test
    void sixWeighInDaysAreNotReadySevenAre() throws Exception {
        AccountId account = support.consentingAccount();
        for (int i = 0; i < 6; i++) {
            weighIn(account, DAY_1.plusDays(i), 7, 80.0 + i / 10.0, "MANUAL");
        }

        Map<String, Object> six = map(support.get(account, SUMMARY));
        assertThat(six).containsEntry("weighInCount", 6).containsEntry("trendMinWeighIns", 7).containsEntry("trendReady", false);

        weighIn(account, DAY_1.plusDays(6), 7, 80.6, "APPLE_HEALTH");

        Map<String, Object> seven = map(support.get(account, SUMMARY));
        assertThat(seven).containsEntry("weighInCount", 7).containsEntry("trendReady", true);
        assertThat(node(seven.get("last"))).containsEntry("kg", 80.6).containsEntry("source", "APPLE_HEALTH").containsKeys("id", "clientId", "measuredAt");
    }

    @Test
    void importedHistoryCountsLikeInTheTrend() throws Exception {
        AccountId account = support.consentingAccount();
        for (int i = 0; i < 7; i++) {
            weighIn(account, DAY_1.plusDays(i), 7, 90.0 - i / 10.0, "IMPORT");
        }

        assertThat(map(support.get(account, SUMMARY))).containsEntry("weighInCount", 7).containsEntry("trendReady", true);
        // The trend the user sees takes the same days (it has a point for each of them).
        assertThat(list(support.get(account, "/v1/weight-trend?from=2026-09-01&to=2026-09-07"))).hasSize(7);
    }

    @Test
    void twoWeighInsOnOneDayAreOneDayAndTheLastIsTheLaterOne() throws Exception {
        AccountId account = support.consentingAccount();
        weighIn(account, DAY_1, 7, 80.4, "MANUAL");
        weighIn(account, DAY_1, 21, 81.2, "MANUAL");

        Map<String, Object> summary = map(support.get(account, SUMMARY));

        assertThat(summary).containsEntry("weighInCount", 1).containsEntry("trendReady", false);
        assertThat(node(summary.get("last"))).containsEntry("kg", 81.2);
    }

    @Test
    void itIsTheAccountsOwnAndAlwaysFresh() throws Exception {
        AccountId mine = support.consentingAccount();
        AccountId other = support.consentingAccount();
        weighIn(other, DAY_1, 7, 70.2, "MANUAL");
        weighIn(mine, DAY_1, 7, 80.3, "MANUAL");

        assertThat(map(support.get(mine, SUMMARY))).containsEntry("weighInCount", 1);
        assertThat(node(map(support.get(mine, SUMMARY)).get("last"))).containsEntry("kg", 80.3);

        // A deleted weigh-in leaves the count: nothing is cached.
        String id = (String) node(map(support.get(mine, SUMMARY)).get("last")).get("id");
        assertThat(support.delete(mine, "/v1/weigh-ins/" + id)).hasStatus(204);
        assertThat(map(support.get(mine, SUMMARY))).containsEntry("weighInCount", 0).doesNotContainKey("last");
    }

    @Test
    void theWeightTrendIsUnchangedByTheGate() throws Exception {
        AccountId account = support.consentingAccount();
        weighIn(account, DAY_1, 7, 83.4, "MANUAL");

        // One weigh-in is far from ready, yet the trend still has its point: the gate is the phone's to show, not the trend's to withhold.
        assertThat(map(support.get(account, SUMMARY))).containsEntry("trendReady", false);
        assertThat(list(support.get(account, "/v1/weight-trend?from=2026-09-01&to=2026-09-01")))
                .singleElement().satisfies(point -> {
                    assertThat(point).containsEntry("day", "2026-09-01");
                    assertThat(((Number) point.get("kg")).doubleValue()).isEqualTo(83.4);
                });
    }

    @Test
    void withoutAProfileItAnswersInUtcDaysWhileTheTrendHasNoProfileToRead() throws Exception {
        AccountId account = TestSessions.newAccount();
        assertThat(support.send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA))).hasStatusOk();
        // 22:30 UTC on the 1st and 05:00 UTC on the 2nd are two UTC days (one day in Istanbul, which this user does not have).
        for (String at : new String[] {"2026-09-01T22:30:00Z", "2026-09-02T05:00:00Z"}) {
            assertThat(support.send(account, "POST", "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt", at, "kg", 80.4,
                    "source", "MANUAL")).getResponse().getStatus()).isLessThan(300);
        }

        Map<String, Object> summary = map(support.get(account, SUMMARY));

        assertThat(summary).containsEntry("weighInCount", 2).containsEntry("trendMinWeighIns", 7).containsEntry("trendReady", false);
        assertThat(node(summary.get("last"))).containsEntry("measuredAt", "2026-09-02T05:00:00Z");
        assertThat(support.get(account, "/v1/weight-trend?from=2026-09-01&to=2026-09-02")).hasStatus(404);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> node(Object json) {
        return (Map<String, Object>) json;
    }

    private void weighIn(AccountId account, LocalDate day, int hour, double kg, String source) {
        Instant at = day.atTime(hour, 0).atZone(ISTANBUL).toInstant();
        assertThat(support.send(account, "POST", "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt", at.toString(), "kg", kg,
                "source", source)).getResponse().getStatus()).isLessThan(300);
    }
}
