package app.keel.measurement;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/**
 * An imported weigh-in (IMPORT, K-616) is seen, not decided on (ADR-053): the engine's daily weights and the last weight
 * the targets fall back to leave it out; the trend's read keeps it.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class ImportedWeighInsTests {

    private static final ZoneId ISTANBUL = ZoneId.of("Europe/Istanbul");

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    Measurements measurements;

    @Test
    void theLastWeightIsTheUsersOwnNotAnImportedOne() {
        MeasurementTestSupport support = new MeasurementTestSupport(mvc, context);
        AccountId account = support.consentingAccount();
        weighIn(support, account, Instant.now().minus(40, ChronoUnit.DAYS), 90, "MANUAL");
        weighIn(support, account, Instant.now().minus(1, ChronoUnit.DAYS), 70, "IMPORT");

        assertThat(measurements.latestWeightKg(account)).hasValueSatisfying(kg -> assertThat(kg).isEqualByComparingTo("90"));
    }

    @Test
    void theEngineDaysLeaveTheImportedOutTheTrendsKeepIt() {
        MeasurementTestSupport support = new MeasurementTestSupport(mvc, context);
        AccountId account = support.consentingAccount();
        LocalDate today = LocalDate.now(ISTANBUL);
        weighIn(support, account, today.minusDays(3).atTime(8, 0).atZone(ISTANBUL).toInstant(), 81, "APPLE_HEALTH");
        weighIn(support, account, today.minusDays(2).atTime(8, 0).atZone(ISTANBUL).toInstant(), 82, "IMPORT");

        assertThat(measurements.dailyWeights(account, today.minusDays(7), today)).extracting(w -> w.date())
                .containsExactly(today.minusDays(3));
        assertThat(measurements.dailyWeightsWithImported(account, today.minusDays(7), today)).extracting(w -> w.kg())
                .usingElementComparator(BigDecimal::compareTo).containsExactly(new BigDecimal("81"), new BigDecimal("82"));
    }

    private static void weighIn(MeasurementTestSupport support, AccountId account, Instant at, double kg, String source) {
        assertThat(support.send(account, "POST", "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt", at.toString(), "kg", kg,
                "source", source)).getResponse().getStatus()).isLessThan(300);
    }
}
