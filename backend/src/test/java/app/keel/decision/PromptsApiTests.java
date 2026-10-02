package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * The coach's own questions (K-512, ADR-039): read from the user's logs, asked in the app, once each. An answer is
 * kept (health data: behind the consent, deleted with it) and never changes a call; some come with a short reply.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class PromptsApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Test
    @SuppressWarnings("unchecked")
    void stepsFallingUnderTheTargetAreAskedAboutWithTheRuleAndItsSource() throws Exception {
        AccountId account = ready();
        stepsDropped(account);

        List<Map<String, Object>> prompts = list(account);

        assertThat(prompts).singleElement().satisfies(prompt -> {
            assertThat(prompt).containsEntry("rule", "steps_dropped").containsEntry("key", monday().toString())
                    .containsEntry("copyKey", "prompt.steps_dropped").containsEntry("choices", List.of("BUSY", "LESS"));
            assertThat((Map<String, Object>) prompt.get("source")).containsEntry("reference", "arastirma/ham/guray/G5-surec-supplement.md#T-13")
                    .containsEntry("tag", "EXPERIENCE");
        });
    }

    @Test
    void answeredOnceItIsNotAskedAgainAndSomeAnswersHaveAReply() throws Exception {
        AccountId account = ready();
        stepsDropped(account);

        MvcTestResult answered = answer(account, "steps_dropped", monday().toString(), "LESS");

        assertThat(read(answered)).containsEntry("replyCopyKey", "prompt.steps_dropped.reply.less");
        assertThat(list(account)).isEmpty();
        assertThat(read(answer(account, "steps_dropped", monday().toString(), "LESS"))).as("the same answer again: the same reply")
                .containsEntry("replyCopyKey", "prompt.steps_dropped.reply.less");
    }

    @Test
    void anAnswerThatTakesTheUserElsewhereHasNoReply() throws Exception {
        AccountId account = ready();
        assertThat(read(answer(account, "steps_dropped", monday().toString(), "BUSY"))).doesNotContainKey("replyCopyKey");
    }

    @Test
    void whatIsNotAQuestionOrNotItsAnswerIsRefused() {
        AccountId account = ready();
        assertThat(answer(account, "no_such_rule", monday().toString(), "OK")).hasStatus(400);
        assertThat(answer(account, "loads_dropped", monday().toString(), "LESS")).hasStatus(400);
        assertThat(answer(account, "loads_dropped", "not-a-day", "OK")).hasStatus(400);
    }

    @Test
    void aDeclaredWeekAsksNothing() throws Exception {
        AccountId account = ready();
        stepsDropped(account);
        assertThat(send(account, "PUT", "/v1/state", Map.of("kind", "BUSY"))).hasStatusOk();

        assertThat(list(account)).isEmpty();
    }

    @Test
    void theyAreHealthDataSoTheyNeedTheConsent() {
        AccountId account = TestSessions.newAccount();
        assertThat(send(account, "GET", "/v1/prompts", null)).hasStatus(403).bodyJson().extractingPath("$.code").isEqualTo("CONSENT_REQUIRED");
        assertThat(answer(account, "loads_dropped", monday().toString(), "OK")).hasStatus(403);
    }

    /** A man on UTC with the consent and a profile, training on Mondays. */
    private AccountId ready() {
        AccountId account = TestSessions.newAccount();
        assertThat(send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA))).hasStatusOk();
        assertThat(send(account, "PUT", "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")))).hasStatusOk();
        return account;
    }

    /** The week before last on 9,000 steps a day, the last seven days on 4,000: under the starting target (7,000). */
    private void stepsDropped(AccountId account) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        for (int day = 1; day <= 14; day++) {
            assertThat(send(account, "PUT", "/v1/activity-days", Map.of("day", today.minusDays(day).toString(), "steps", day <= 7 ? 4000 : 9000)))
                    .hasStatusOk();
        }
    }

    private static LocalDate monday() {
        return LocalDate.now(ZoneOffset.UTC).with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> list(AccountId account) throws Exception {
        MvcTestResult result = send(account, "GET", "/v1/prompts", null);
        assertThat(result).hasStatusOk();
        return JSON.readValue(result.getResponse().getContentAsString(), List.class);
    }

    private MvcTestResult answer(AccountId account, String rule, String key, String choice) {
        return send(account, "POST", "/v1/prompts/" + rule + "/answers", Map.of("key", key, "choice", choice));
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> read(MvcTestResult result) throws Exception {
        assertThat(result).hasStatusOk();
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }

    private MvcTestResult send(AccountId account, String method, String uri, Object body) {
        var request = switch (method) {
            case "GET" -> mvc.get();
            case "PUT" -> mvc.put();
            default -> mvc.post();
        };
        request = request.uri(uri).header("Authorization", TestSessions.bearer(context, account));
        if (body != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(body));
        }
        return request.exchange();
    }
}
