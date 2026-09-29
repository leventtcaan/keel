package app.keel.measurement;

import static app.keel.measurement.MeasurementTestSupport.list;
import static app.keel.measurement.MeasurementTestSupport.map;
import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
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
 * The engine's main time series (K-206): weigh-ins (typed or from Apple Health), waist, what the phone concluded from a
 * progress photo (never the photo, V1), a day's steps, sleep and active energy — each health data, so each needs the
 * health-data consent (ADR-007, ADR-026). Days are the user's local days; the trend is the engine's.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class MeasurementApiTests {

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
    void withoutTheHealthDataConsentNothingIsStoredOrShown() {
        AccountId account = TestSessions.newAccount();

        assertThat(support.send(account, "POST", "/v1/weigh-ins", weighIn("2026-09-30T05:00:00Z", 82.4))).hasStatus(403)
                .bodyJson().extractingPath("$.code").isEqualTo("CONSENT_REQUIRED");
        assertThat(support.get(account, "/v1/weigh-ins?from=2026-09-01&to=2026-09-30")).hasStatus(403);
        assertThat(support.get(account, "/v1/weight-trend?from=2026-09-01&to=2026-09-30")).hasStatus(403);
        assertThat(support.send(account, "POST", "/v1/waist-measurements", waist("2026-09-30", 88))).hasStatus(403);
        assertThat(support.send(account, "POST", "/v1/photo-checks", Map.of("clientId", UUID.randomUUID(), "takenOn", "2026-09-30",
                "look", "SAME"))).hasStatus(403);
        assertThat(support.send(account, "PUT", "/v1/activity-days", Map.of("day", "2026-09-30", "steps", 8000))).hasStatus(403);
        assertThat(support.get(account, "/v1/waist-measurements?from=2026-09-01&to=2026-09-30")).hasStatus(403);
        assertThat(support.delete(account, "/v1/weigh-ins/" + UUID.randomUUID())).hasStatus(403);
    }

    @Test
    void aWeighInIsStoredAndListedByTheUsersLocalDay() throws Exception {
        AccountId account = support.consentingAccount();
        // 23:30 UTC on the 29th is 02:30 on the 30th in Istanbul: it belongs to the 30th.
        MvcTestResult created = support.send(account, "POST", "/v1/weigh-ins", weighIn("2026-09-29T23:30:00Z", 82.4));

        assertThat(created).hasStatus(201);
        assertThat(map(created)).containsKey("id").containsEntry("kg", 82.4).containsEntry("source", "MANUAL");
        assertThat(list(support.get(account, "/v1/weigh-ins?from=2026-09-30&to=2026-09-30"))).hasSize(1);
        assertThat(list(support.get(account, "/v1/weigh-ins?from=2026-09-29&to=2026-09-29"))).isEmpty();
    }

    @Test
    void aWeighInCanBeDeletedButOnlyByItsOwner() throws Exception {
        AccountId owner = support.consentingAccount();
        String id = (String) map(support.send(owner, "POST", "/v1/weigh-ins", weighIn("2026-09-30T05:00:00Z", 82.4))).get("id");

        assertThat(support.delete(support.consentingAccount(), "/v1/weigh-ins/" + id)).hasStatus(404);
        assertThat(support.delete(owner, "/v1/weigh-ins/" + id)).hasStatus(204);
        assertThat(list(support.get(owner, "/v1/weigh-ins?from=2026-09-30&to=2026-09-30"))).isEmpty();
    }

    @Test
    void theTrendIsTheEnginesSevenDayAverageOnTheFirstWeighInOfEachDay() throws Exception {
        AccountId account = support.consentingAccount();
        support.send(account, "POST", "/v1/weigh-ins", weighIn("2026-08-24T05:00:00Z", 83.0));
        support.send(account, "POST", "/v1/weigh-ins", weighIn("2026-08-24T18:00:00Z", 84.5)); // evening: not the morning weight
        support.send(account, "POST", "/v1/weigh-ins", weighIn("2026-08-26T05:00:00Z", 82.0));
        support.send(account, "POST", "/v1/weigh-ins", weighIn("2026-08-30T05:00:00Z", 81.0));

        List<Map<String, Object>> trend = list(support.get(account, "/v1/weight-trend?from=2026-08-23&to=2026-09-01"));

        // 24th: 83.0 · 25th: 83.0 · 26th: (83 + 82) / 2 · … · 30th: (83 + 82 + 81) / 3 = 82 · 31st: (82 + 81) / 2 (the
        // 24th left the 7 days) · 1 September: the same. The 23rd has no weigh-in in its 7 days, so no point.
        assertThat(trend).extracting(point -> point.get("day")).containsExactly("2026-08-24", "2026-08-25", "2026-08-26",
                "2026-08-27", "2026-08-28", "2026-08-29", "2026-08-30", "2026-08-31", "2026-09-01");
        assertThat(trend).extracting(point -> ((Number) point.get("kg")).doubleValue())
                .containsExactly(83.0, 83.0, 82.5, 82.5, 82.5, 82.5, 82.0, 81.5, 81.5);
    }

    @Test
    void waistIsStoredAndListed() throws Exception {
        AccountId account = support.consentingAccount();

        assertThat(support.send(account, "POST", "/v1/waist-measurements", waist("2026-09-30", 88.5))).hasStatus(201);

        assertThat(list(support.get(account, "/v1/waist-measurements?from=2026-09-30&to=2026-09-30")))
                .singleElement().satisfies(w -> assertThat(w).containsEntry("cm", 88.5).containsEntry("measuredOn", "2026-09-30"));
    }

    @Test
    void aPhotoCheckCarriesOnlyWhatThePhoneConcluded() throws Exception {
        AccountId account = support.consentingAccount();

        MvcTestResult created = support.send(account, "POST", "/v1/photo-checks",
                Map.of("clientId", UUID.randomUUID(), "takenOn", "2026-09-30", "look", "BETTER"));

        assertThat(created).hasStatus(201);
        assertThat(map(created).keySet()).containsExactlyInAnyOrder("id", "clientId", "takenOn", "look");
    }

    @Test
    void anActivityDayReplacesThatDaysValues() throws Exception {
        AccountId account = support.consentingAccount();
        support.send(account, "PUT", "/v1/activity-days", Map.of("day", "2026-09-30", "steps", 4000));

        MvcTestResult replaced = support.send(account, "PUT", "/v1/activity-days",
                Map.of("day", "2026-09-30", "steps", 8200, "sleepMinutes", 430, "activeEnergyKcal", 520));
        assertThat(replaced).hasStatusOk();
        assertThat(map(replaced)).isEqualTo(Map.of("day", "2026-09-30", "steps", 8200, "sleepMinutes", 430, "activeEnergyKcal", 520));

        // Replace, not merge: a value the new PUT leaves out is gone.
        assertThat(map(support.send(account, "PUT", "/v1/activity-days", Map.of("day", "2026-09-30", "steps", 9000))))
                .isEqualTo(Map.of("day", "2026-09-30", "steps", 9000));
    }

    @Test
    void valuesTheStoreCannotHoldAreValidationErrorsNotServerErrors() {
        // A 500 makes the offline phone retry the record forever (ADR-006); a value out of range is the client's to fix.
        AccountId account = support.consentingAccount();

        assertThat(support.send(account, "POST", "/v1/weigh-ins", weighIn("2026-09-30T05:00:00Z", 10_000))).hasStatus(400);
        assertThat(support.send(account, "POST", "/v1/weigh-ins", weighIn("2026-09-30T05:00:00Z", 82.004))).hasStatus(400);
        assertThat(support.send(account, "POST", "/v1/waist-measurements", waist("2026-09-30", 10_000))).hasStatus(400);
        assertThat(support.send(account, "POST", "/v1/waist-measurements", waist("2026-09-30", 88.04))).hasStatus(400);
    }

    @Test
    void aMalformedDateOrIdIsAValidationError() {
        AccountId account = support.consentingAccount();

        assertThat(support.get(account, "/v1/weigh-ins?from=abc&to=2026-09-30")).hasStatus(400);
        assertThat(support.delete(account, "/v1/weigh-ins/not-an-id")).hasStatus(400);
    }

    @Test
    void aRangeLongerThanTheLimitIsAValidationError() {
        AccountId account = support.consentingAccount();

        assertThat(support.get(account, "/v1/weight-trend?from=1000-01-01&to=9999-12-31")).hasStatus(400);
        assertThat(support.get(account, "/v1/weigh-ins?from=1000-01-01&to=9999-12-31")).hasStatus(400);
        assertThat(support.get(account, "/v1/waist-measurements?from=1000-01-01&to=9999-12-31")).hasStatus(400);
    }

    @Test
    void theTrendStopsAtTodayInTheUsersTimeZone() throws Exception {
        AccountId account = support.consentingAccount();
        LocalDate today = LocalDate.now(ZoneId.of("Europe/Istanbul"));
        support.send(account, "POST", "/v1/weigh-ins", weighIn(today.atTime(6, 0).atZone(ZoneId.of("Europe/Istanbul")).toInstant().toString(), 81));

        List<Map<String, Object>> trend = list(support.get(account, "/v1/weight-trend?from=" + today + "&to=" + today.plusDays(5)));

        assertThat(trend).extracting(point -> point.get("day")).containsExactly(today.toString());
    }

    @Test
    void wholeKilogramsAreWrittenAsPlainNumbers() throws Exception {
        AccountId account = support.consentingAccount();

        MvcTestResult created = support.send(account, "POST", "/v1/weigh-ins", weighIn("2026-09-30T05:00:00Z", 80.0));

        assertThat(created.getResponse().getContentAsString()).contains("\"kg\":80").doesNotContain("E+");
    }

    @Test
    void impossibleValuesAreValidationErrors() {
        AccountId account = support.consentingAccount();

        assertThat(support.send(account, "POST", "/v1/weigh-ins", weighIn("2026-09-30T05:00:00Z", 0))).hasStatus(400);
        assertThat(support.send(account, "POST", "/v1/weigh-ins", Map.of("measuredAt", "2026-09-30T05:00:00Z", "kg", 80, "source", "MANUAL")))
                .as("no clientId").hasStatus(400);
        assertThat(support.send(account, "POST", "/v1/waist-measurements", waist("2026-09-30", -1))).hasStatus(400);
        assertThat(support.send(account, "POST", "/v1/photo-checks", Map.of("clientId", UUID.randomUUID(), "takenOn", "2026-09-30",
                "look", "SEXY"))).hasStatus(400);
        assertThat(support.send(account, "PUT", "/v1/activity-days", Map.of("day", "2026-09-30", "steps", -5))).hasStatus(400);
        assertThat(support.get(account, "/v1/weigh-ins?from=2026-09-30&to=2026-09-01")).as("to before from").hasStatus(400);
    }

    static Map<String, Object> weighIn(String measuredAt, double kg) {
        return Map.of("clientId", UUID.randomUUID(), "measuredAt", measuredAt, "kg", kg, "source", "MANUAL");
    }

    static Map<String, Object> waist(String on, double cm) {
        return Map.of("clientId", UUID.randomUUID(), "measuredOn", on, "cm", cm);
    }
}
