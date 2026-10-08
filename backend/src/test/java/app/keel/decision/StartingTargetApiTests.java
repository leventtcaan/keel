package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.engine.InitialTarget;
import app.keel.engine.ParameterKey;
import app.keel.engine.ParameterSet;
import app.keel.engine.Profile;
import app.keel.engine.Sex;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.profile.TestOnboarding;
import app.keel.shared.AccountId;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * The starting target before the first call (K-989, contract GET /v1/targets/starting, ADR-072 #6): at the end of
 * onboarding — a profile and a weigh-in, with the health data consent — the engine's starting estimate, the same number the
 * first call then starts the plan with (U1). Nothing is stored. Without the consent, a profile or a weigh-in, or once the
 * plan has begun, a status code says why.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class StartingTargetApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final double KG = 82.4;
    private static final int BIRTH_YEAR = 1996;
    private static final int HEIGHT_CM = 180;

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Autowired
    ParameterSet parameters;

    @Test
    void afterOnboardingTheEnginesStartingEstimateIsReadAndNothingIsStored() throws Exception {
        AccountId account = onboarded("MALE");

        MvcTestResult result = send(account, "GET", "/v1/targets/starting", null);

        assertThat(result).hasStatusOk();
        InitialTarget.Estimate engine = InitialTarget.estimate(Sex.MALE, BigDecimal.valueOf(KG),
                new Profile(LocalDate.now(ZoneOffset.UTC).getYear() - BIRTH_YEAR, HEIGHT_CM), Optional.empty(), parameters.forSex(Sex.MALE));
        assertThat(map(result)).isEqualTo(Map.of("targetKcal", engine.maintenanceKcal(),
                "maintenanceKcal", Map.of("low", engine.lowKcal(), "high", engine.highKcal()),
                "observationDays", parameters.forSex(Sex.MALE).wholeNumber(ParameterKey.MAINTENANCE_OBSERVATION_DAYS)));
        assertThat(jdbc.sql("select count(*) from decision.plan where account_id = :a").param("a", account.value()).query(Integer.class).single())
                .as("not a call: no plan is started").isZero();
        assertThat(jdbc.sql("select count(*) from decision.weekly_call where account_id = :a").param("a", account.value()).query(Integer.class)
                .single()).isZero();
    }

    @Test
    void theFirstCallStartsThePlanWithTheSameNumber() throws Exception {
        AccountId account = onboarded("MALE");
        Object starting = map(send(account, "GET", "/v1/targets/starting", null)).get("targetKcal");

        assertThat(send(account, "POST", "/v1/check-ins/current/answers", Map.of("clientId", UUID.randomUUID(), "weekOf",
                CheckInWeek.weekOf(LocalDate.now(ZoneOffset.UTC), DayOfWeek.MONDAY).toString(), "answers", List.of()))).hasStatusOk();

        assertThat(jdbc.sql("select target_kcal from decision.plan where account_id = :a").param("a", account.value()).query(Integer.class)
                .single()).isEqualTo(starting);
        assertThat(map(send(account, "GET", "/v1/targets", null))).containsEntry("targetKcal", starting);
        MvcTestResult begun = send(account, "GET", "/v1/targets/starting", null);
        assertThat(begun).as("the plan has begun: its targets are /v1/targets").hasStatus(409);
        assertThat(map(begun)).containsEntry("code", "CONFLICT");
    }

    @Test
    void theScaleWatchesForTheDaysTheParametersGiveTheUsersSex() throws Exception {
        AccountId account = onboarded("FEMALE");

        assertThat(map(send(account, "GET", "/v1/targets/starting", null)))
                .containsEntry("observationDays", parameters.forSex(Sex.FEMALE).wholeNumber(ParameterKey.MAINTENANCE_OBSERVATION_DAYS));
    }

    @Test
    void withoutAWeighInThereIsNoStartingTarget() throws Exception {
        AccountId account = TestSessions.newAccount();
        consent(account);
        send(account, "PUT", "/v1/profile", profile("MALE"));

        MvcTestResult result = send(account, "GET", "/v1/targets/starting", null);

        assertThat(result).hasStatus(404);
        assertThat(map(result)).containsEntry("code", "NOT_FOUND");
    }

    @Test
    void withoutTheConsentItIsNotRead() throws Exception {
        AccountId never = TestSessions.newAccount();
        send(never, "PUT", "/v1/profile", profile("MALE"));
        MvcTestResult refused = send(never, "GET", "/v1/targets/starting", null);
        assertThat(refused).hasStatus(403);
        assertThat(map(refused)).containsEntry("code", "CONSENT_REQUIRED");

        AccountId withdrawn = onboarded("MALE");
        send(withdrawn, "DELETE", "/v1/consents/HEALTH_DATA?confirmDataDeletion=true", null);
        assertThat(send(withdrawn, "GET", "/v1/targets/starting", null)).hasStatus(403);
    }

    @Test
    void withoutAProfileItIsAConflict() throws Exception {
        AccountId account = TestSessions.newAccount();
        consent(account);

        MvcTestResult result = send(account, "GET", "/v1/targets/starting", null);

        assertThat(result).hasStatus(409);
        assertThat(map(result)).containsEntry("code", "CONFLICT");
    }

    private AccountId onboarded(String sex) {
        AccountId account = TestSessions.newAccount();
        consent(account);
        send(account, "PUT", "/v1/profile", profile(sex));
        TestOnboarding.finishedTwoWeeksAgo(context, account);
        assertThat(send(account, "POST", "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt",
                Instant.now().minusSeconds(3600).toString(), "kg", KG, "source", "MANUAL")).getResponse().getStatus()).isLessThan(300);
        return account;
    }

    private void consent(AccountId account) {
        send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA));
    }

    private static Map<String, Object> profile(String sex) {
        return new HashMap<>(Map.of("goal", "LOSE_FAT", "sex", sex, "heightCm", HEIGHT_CM, "birthYear", BIRTH_YEAR,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")));
    }

    private MvcTestResult send(AccountId account, String method, String uri, Object body) {
        var request = switch (method) {
            case "GET" -> mvc.get();
            case "PUT" -> mvc.put();
            case "DELETE" -> mvc.delete();
            default -> mvc.post();
        };
        request = request.uri(uri).header("Authorization", TestSessions.bearer(context, account));
        if (body != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(body));
        }
        return request.exchange();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(MvcTestResult result) throws Exception {
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }
}
