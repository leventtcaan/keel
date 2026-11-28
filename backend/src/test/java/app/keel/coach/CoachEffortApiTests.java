package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.profile.TestOnboarding;
import app.keel.shared.AccountId;
import app.keel.subscription.TestWebhooks;
import java.time.Instant;
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
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * "Why did it feel heavy?" (K-1265, ADR-096 › Çok ağır mı, paid side; #4): a subscriber's coach is told each move's effort as the
 * engine reads it and the workouts it went lighter in, and nothing else of why; without a subscription (the introductory
 * questions, ADR-092 #7) it is told none of it. A cause the log does not hold is never shown.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class CoachEffortApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String QUESTION = "Why did my squat feel so heavy?";

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Autowired
    LanguageModel model;

    private FakeLanguageModel fake;

    @BeforeEach
    void forget() {
        fake = (FakeLanguageModel) model;
        fake.forget();
        jdbc.sql("delete from coach.model_spend").update();
    }

    @Test
    void aSubscribersCoachIsToldTheWorkoutsTheMoveWentLighterIn() throws Exception {
        AccountId account = wentLighterOnSquat(true);
        fake.answer("{\"reply\":\"The call stands this week.\",\"topic\":\"WHY\",\"numbersUsed\":[]}");

        assertThat(ask(account)).hasStatusOk();

        assertThat(fake.requests()).singleElement().satisfies(request -> assertThat(request.system())
                .contains("\"effort\":{", "\"move\":\"squat\"", "\"wentLighterWorkouts\":1", "\"windowDays\":"));
    }

    @Test
    void withoutASubscriptionTheCoachIsToldNoneOfIt() throws Exception {
        AccountId account = wentLighterOnSquat(false);
        fake.answer("{\"reply\":\"The call stands this week.\",\"topic\":\"WHY\",\"numbersUsed\":[]}");

        assertThat(ask(account)).hasStatusOk();

        assertThat(fake.requests()).singleElement().satisfies(request -> assertThat(request.system())
                .contains("FACTS:").doesNotContain("\"effort\":{", "wentLighterWorkouts"));
    }

    @Test
    void aCauseTheLogDoesNotHoldGetsTheEnginesWords() throws Exception {
        AccountId account = wentLighterOnSquat(true);
        fake.answer("{\"reply\":\"It felt heavy because you slept badly this week.\",\"topic\":\"WHY\",\"numbersUsed\":[]}");

        Map<String, Object> answer = JSON.readValue(ask(account).getResponse().getContentAsString(), Map.class);

        assertThat(answer).containsEntry("mode", "DETERMINISTIC").doesNotContainKey("reply");
    }

    /** Both consents, a program with squat, this week's call, and a squat set logged after "Too heavy?" in a workout today. */
    @SuppressWarnings("unchecked")
    private AccountId wentLighterOnSquat(boolean subscribed) throws Exception {
        AccountId account = TestSessions.newAccount();
        TestSessions.bearer(context, account);
        if (subscribed) {
            TestWebhooks.subscribe(mvc, context, account);
        }
        send(account, "/v1/consents/HEALTH_DATA", "PUT", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA));
        send(account, "/v1/consents/THIRD_PARTY_AI", "PUT", Map.of("textVersion", ConsentTextVersions.THIRD_PARTY_AI, "provider", "Example AI",
                "dataTypes", List.of("meal photo", "meal note", "coach question")));
        assertThat(send(account, "/v1/profile", "PUT", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")))).hasStatusOk();
        TestOnboarding.finishedTwoWeeksAgo(context, account);
        send(account, "/v1/weigh-ins", "POST", Map.of("clientId", UUID.randomUUID(), "measuredAt", Instant.now().minusSeconds(3600).toString(),
                "kg", 82.4, "source", "MANUAL"));
        assertThat(send(account, "/v1/program", "PUT", Map.of("days", List.of(Map.of("name", "Full body", "weekday", "MONDAY", "exercises",
                List.of(Map.of("exerciseId", "squat", "sets", 3, "reps", Map.of("min", 6, "max", 10)))))))).hasStatusOk();
        String weekOf = (String) JSON.readValue(mvc.get().uri("/v1/check-ins/current").header("Authorization", TestSessions.bearer(context, account))
                .exchange().getResponse().getContentAsString(), Map.class).get("weekOf");
        assertThat(send(account, "/v1/check-ins/current/answers", "POST", Map.of("clientId", UUID.randomUUID(), "weekOf", weekOf, "answers", List.of())))
                .hasStatusOk();
        jdbc.sql("""
                update decision.weekly_call set decision = decision || '{"action": {"type": "ADJUST_CALORIES", "kcalPerDay": -500},
                    "copyKey": "decision.adjust_calories.cut"}'::jsonb where account_id = :a""").param("a", account.value()).update();
        Map<String, Object> program = JSON.readValue(mvc.get().uri("/v1/program").header("Authorization", TestSessions.bearer(context, account))
                .exchange().getResponse().getContentAsString(), Map.class);
        String day = (String) ((List<Map<String, Object>>) program.get("days")).getFirst().get("id");
        MvcTestResult started = send(account, "/v1/workouts", "POST", Map.of("clientId", UUID.randomUUID(),
                "startedAt", Instant.now().toString(), "programDayId", day)); // after the program was made: the log is read from then
        assertThat(started).hasStatus(201);
        String workout = (String) JSON.readValue(started.getResponse().getContentAsString(), Map.class).get("id");
        assertThat(send(account, "/v1/workouts/" + workout + "/sets", "POST", Map.of("clientId", UUID.randomUUID(), "exerciseId", "squat",
                "setType", "WORKING", "loadKg", 97.5, "reps", 8, "rir", 1, "side", "BOTH", "wentLighter", true))).hasStatus(201);
        return account;
    }

    private MvcTestResult ask(AccountId account) {
        return send(account, "/v1/coach/messages", "POST", Map.of("text", QUESTION));
    }

    private MvcTestResult send(AccountId account, String uri, String method, Object body) {
        var request = switch (method) {
            case "PUT" -> mvc.put();
            default -> mvc.post();
        };
        request = request.uri(uri).header("Authorization", TestSessions.bearer(context, account));
        return (body == null ? request : request.contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(body))).exchange();
    }
}
