package app.keel.measurement;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
import app.keel.shared.AccountId;
import java.util.List;
import java.util.Map;
import org.springframework.context.ApplicationContext;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/** An account with the health-data consent and an Istanbul profile, and JSON calls as that account. */
final class MeasurementTestSupport {

    static final JsonMapper JSON = JsonMapper.builder().build();

    private final MockMvcTester mvc;
    private final ApplicationContext context;

    MeasurementTestSupport(MockMvcTester mvc, ApplicationContext context) {
        this.mvc = mvc;
        this.context = context;
    }

    AccountId consentingAccount() {
        AccountId account = TestSessions.newAccount();
        assertThat(send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA))).hasStatusOk();
        assertThat(send(account, "PUT", "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC", "schedule", Map.of("trainingDays", List.of("MONDAY"),
                        "checkInDay", "MONDAY", "timeZone", "Europe/Istanbul")))).hasStatusOk();
        return account;
    }

    MvcTestResult send(AccountId account, String method, String uri, Object body) {
        var request = switch (method) {
            case "POST" -> mvc.post();
            case "PUT" -> mvc.put();
            default -> throw new IllegalArgumentException(method);
        };
        return request.uri(uri).header("Authorization", TestSessions.bearer(context, account))
                .contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(body)).exchange();
    }

    MvcTestResult get(AccountId account, String uri) {
        return mvc.get().uri(uri).header("Authorization", TestSessions.bearer(context, account)).exchange();
    }

    MvcTestResult delete(AccountId account, String uri) {
        return mvc.delete().uri(uri).header("Authorization", TestSessions.bearer(context, account)).exchange();
    }

    @SuppressWarnings("unchecked")
    static Map<String, Object> map(MvcTestResult result) throws Exception {
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }

    @SuppressWarnings("unchecked")
    static List<Map<String, Object>> list(MvcTestResult result) throws Exception {
        assertThat(result).hasStatusOk();
        return JSON.readValue(result.getResponse().getContentAsString(), List.class);
    }
}
