package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.LocalDate;
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
 * POST /v1/coach/messages (K-505): the coach tells the call — the model's words only when they are the call told, the
 * engine's own otherwise — and every answer carries the call as it stands; nothing the user says changes it (U2).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class CoachMessagesApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

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
    }

    @Test
    @SuppressWarnings("unchecked")
    void theCallToldIsShownWithTheCallAsItStands() throws Exception {
        AccountId account = withACutStep();
        Map<String, Object> call = latest(account);
        int day = LocalDate.parse((String) call.get("nextReview")).getDayOfMonth();
        String told = "Your weight held on the plan, so the call takes 500 kcal a day off; it is looked at again on the " + day + "th.";
        fake.answer("{\"text\":\"" + told + "\"}");

        Map<String, Object> answer = ok(ask(account, Map.of("text", "Why less food?")));

        assertThat(answer).containsEntry("mode", "MODEL").containsEntry("text", told).doesNotContainKey("copyKey");
        assertThat((Map<String, Object>) answer.get("call")).isEqualTo(Map.of("decisionId", call.get("id"), "copyKey", "decision.adjust_calories.cut",
                "nextReview", call.get("nextReview")));
        // The model got the call's facts and the question — sources by kind only, no research path, no name (K-523).
        assertThat(fake.requests()).singleElement().satisfies(request -> {
            assertThat(request.purpose()).isEqualTo(Purpose.EXPLAIN);
            assertThat(request.system()).contains("FACTS:", "ADJUST_CALORIES", "-500", "NUMBERS:", "EXPERIENCE").doesNotContain("arastirma/");
            assertThat(request.turns()).containsExactly(Turn.user("Why less food?"));
        });
    }

    @Test
    @SuppressWarnings("unchecked")
    void anObjectionMetWithAConcessionGetsTheEnginesWordsAndTheCallStays() throws Exception {
        AccountId account = withACutStep();
        Map<String, Object> before = latest(account);
        String keptBefore = kept(account);
        fake.answer("{\"text\":\"You're right, I'll lower the cut to 250 this week.\"}");

        Map<String, Object> answer = ok(ask(account, Map.of("text", "This is too hard, make it smaller.")));

        assertThat(answer).containsEntry("mode", "DETERMINISTIC").containsEntry("copyKey", "coach.answer.call").doesNotContainKey("text");
        assertThat((Map<String, Object>) answer.get("call")).containsEntry("decisionId", before.get("id")).containsEntry("copyKey",
                "decision.adjust_calories.cut");
        assertThat(latest(account)).isEqualTo(before);
        assertThat(kept(account)).isEqualTo(keptBefore);
    }

    @Test
    void wordsTheModelMadeUpOrNothingAtAllGetTheEnginesWords() throws Exception {
        AccountId account = withACutStep();
        fake.answer("{\"text\":\"Eat 1,900 kcal a day.\"}");
        assertThat(ok(ask(account, Map.of("text", "How much should I eat?")))).containsEntry("mode", "DETERMINISTIC");
        // Told nothing, the fake answers {}: the deterministic mode.
        assertThat(ok(ask(account, Map.of("text", "How much should I eat?")))).containsEntry("mode", "DETERMINISTIC");
    }

    @Test
    void withoutTheAiConsentNothingIsSent() throws Exception {
        AccountId account = withACutStep();
        jdbc.sql("""
                insert into consent.consent_event (id, account_id, kind, action, text_version, occurred_at)
                values (gen_random_uuid(), :a, 'THIRD_PARTY_AI', 'WITHDRAWN', :version, now())""").param("a", account.value())
                .param("version", ConsentTextVersions.THIRD_PARTY_AI).update();
        fake.answer("{\"text\":\"The call stands.\"}");

        assertThat(ask(account, Map.of("text", "Why?"))).hasStatus(403);
        assertThat(fake.requests()).isEmpty();
    }

    @Test
    void noCallYetIsSaidByTheEngineAndNothingIsSent() throws Exception {
        AccountId account = ready();

        assertThat(ok(ask(account, Map.of("text", "What's my call?")))).isEqualTo(Map.of("mode", "DETERMINISTIC", "copyKey", "coach.answer.no_call"));
        assertThat(fake.requests()).isEmpty();
    }

    @Test
    void theSafetyLabelIsNeverToldByTheModel() throws Exception {
        // ADR-028 #24, V4: what is behind the safety label is never told — not to the model either.
        AccountId account = withACutStep();
        jdbc.sql("update decision.weekly_call set decision = decision || '{\"safety\": true}'::jsonb where account_id = :a")
                .param("a", account.value()).update();

        assertThat(ok(ask(account, Map.of("text", "Why this?")))).containsEntry("mode", "DETERMINISTIC").containsKey("call");
        assertThat(fake.requests()).isEmpty();
    }

    @Test
    void aCallWaitingForTheCycleQuestionIsNeverToldByTheModel() throws Exception {
        // K-505 review, V4: the question exists because of an earlier answer — the call says so to no one but the user.
        AccountId account = withACutStep();
        jdbc.sql("""
                update decision.weekly_call set decision = decision || '{"action": {"type": "NO_DECISION_YET"},
                    "reasons": [{"rule": "cycle_check_needed", "source": {"reference": "arastirma/ham/J1-cinsiyet.md#C6", "tag": "LITERATURE"}}],
                    "copyKey": "decision.no_decision_yet.cycle_check_needed"}'::jsonb where account_id = :a""").param("a", account.value()).update();

        assertThat(ok(ask(account, Map.of("text", "Why no call?")))).containsEntry("mode", "DETERMINISTIC").containsKey("call");
        assertThat(fake.requests()).isEmpty();
    }

    @Test
    void theCallIsHealthDataSoWithoutThatConsentNothingIsSent() throws Exception {
        AccountId account = withACutStep();
        jdbc.sql("""
                insert into consent.consent_event (id, account_id, kind, action, text_version, occurred_at)
                values (gen_random_uuid(), :a, 'HEALTH_DATA', 'WITHDRAWN', :version, now())""").param("a", account.value())
                .param("version", ConsentTextVersions.HEALTH_DATA).update();
        fake.answer("{\"text\":\"The call stands.\"}");

        assertThat(ask(account, Map.of("text", "Why?"))).hasStatus(403);
        assertThat(fake.requests()).isEmpty();
    }

    @Test
    void theCallSaidAsItsOppositeGetsTheEnginesWords() throws Exception {
        AccountId account = withACutStep();
        fake.answer("{\"text\":\"Good news: this week you add 500 kcal a day.\"}");

        assertThat(ok(ask(account, Map.of("text", "I want to eat more.")))).containsEntry("mode", "DETERMINISTIC");
    }

    @Test
    void pastTheDailyLimitTheEngineAnswersAndNothingIsSent() throws Exception {
        // K-508: no hard stop, nothing to buy — the call in the engine's words, with why.
        AccountId account = withACutStep();
        jdbc.sql("""
                insert into subscription.daily_use (account_id, day, use, used)
                values (:a, :day, 'COACH_MESSAGE', 1000)""").param("a", account.value()).param("day", LocalDate.now(java.time.ZoneOffset.UTC)).update();
        fake.answer("{\"text\":\"The call stands.\"}");

        assertThat(ok(ask(account, Map.of("text", "Why?")))).containsEntry("mode", "DETERMINISTIC").containsEntry("copyKey", "coach.answer.daily_limit")
                .containsKey("call");
        assertThat(fake.requests()).isEmpty();
    }

    @Test
    void theLastAnswerOfTheDayIsTheModelsAndTheNextTheEngines() throws Exception {
        AccountId account = withACutStep();
        int limit = limit();
        jdbc.sql("insert into subscription.daily_use (account_id, day, use, used) values (:a, :day, 'COACH_MESSAGE', :n)")
                .param("a", account.value()).param("day", LocalDate.now(java.time.ZoneOffset.UTC)).param("n", limit - 1).update();
        fake.answer("{\"text\":\"The call stands.\"}");
        fake.answer("{\"text\":\"The call stands.\"}");

        assertThat(ok(ask(account, Map.of("text", "Why?")))).containsEntry("mode", "MODEL");
        assertThat(ok(ask(account, Map.of("text", "Why?")))).containsEntry("copyKey", "coach.answer.daily_limit");
        assertThat(fake.requests()).hasSize(1);
        assertThat(used(account)).isEqualTo(limit);
    }

    @Test
    void whatTheModelIsNotAskedForCountsNothing() throws Exception {
        // No call, a call only the engine tells, a call not found, a question not taken, no consent: nothing counted.
        AccountId noCall = ready();
        ok(ask(noCall, Map.of("text", "Why?")));
        assertThat(used(noCall)).isZero();
        AccountId account = withACutStep();
        assertThat(ask(account, Map.of("text", "Why?", "decisionId", UUID.randomUUID()))).hasStatus(404);
        assertThat(ask(account, Map.of("text", " "))).hasStatus(400);
        jdbc.sql("update decision.weekly_call set decision = decision || '{\"safety\": true}'::jsonb where account_id = :a")
                .param("a", account.value()).update();
        ok(ask(account, Map.of("text", "Why?")));
        assertThat(used(account)).isZero();
    }

    @Test
    void aReplyTheCheckDropsStillCountsTheModelWasAsked() throws Exception {
        AccountId account = withACutStep();
        fake.answer("{\"text\":\"Eat 1,900 kcal.\"}");

        assertThat(ok(ask(account, Map.of("text", "Why?")))).containsEntry("mode", "DETERMINISTIC");
        assertThat(used(account)).isEqualTo(1);
    }

    @Test
    void aProviderThatFailsGivesTheUseBack() throws Exception {
        AccountId account = withACutStep();
        fake.fail(new IllegalStateException("provider down"));

        assertThat(ask(account, Map.of("text", "Why?")).getResponse().getStatus()).isGreaterThanOrEqualTo(500);
        assertThat(used(account)).isZero();
    }

    @Test
    void pastTheLimitWithoutTheConsentIsStillAConsentAnswer() throws Exception {
        AccountId account = withACutStep();
        jdbc.sql("insert into subscription.daily_use (account_id, day, use, used) values (:a, :day, 'COACH_MESSAGE', 1000)")
                .param("a", account.value()).param("day", LocalDate.now(java.time.ZoneOffset.UTC)).update();
        jdbc.sql("""
                insert into consent.consent_event (id, account_id, kind, action, text_version, occurred_at)
                values (gen_random_uuid(), :a, 'THIRD_PARTY_AI', 'WITHDRAWN', :version, now())""").param("a", account.value())
                .param("version", ConsentTextVersions.THIRD_PARTY_AI).update();

        assertThat(ask(account, Map.of("text", "Why?"))).hasStatus(403);
    }

    private static int limit() throws Exception {
        java.util.List<java.util.Map<String, Object>> parameters = (java.util.List<java.util.Map<String, Object>>) new org.yaml.snakeyaml.Yaml()
                .<java.util.Map<String, Object>>load(java.nio.file.Files.readString(java.nio.file.Path.of("../data/parameters/quota.yaml"))).get("parameters");
        return parameters.stream().filter(parameter -> "coach_messages_per_day".equals(parameter.get("key"))).map(parameter -> (Integer) parameter.get("value"))
                .findFirst().orElseThrow();
    }

    @Test
    void aMessageTheModelWasAskedIsCountedAndOneThatWasRefusedIsNot() throws Exception {
        AccountId account = withACutStep();
        fake.answer("{\"text\":\"The call stands.\"}");
        ok(ask(account, Map.of("text", "Why?")));
        assertThat(used(account)).isEqualTo(1);

        jdbc.sql("""
                insert into consent.consent_event (id, account_id, kind, action, text_version, occurred_at)
                values (gen_random_uuid(), :a, 'THIRD_PARTY_AI', 'WITHDRAWN', :version, now())""").param("a", account.value())
                .param("version", ConsentTextVersions.THIRD_PARTY_AI).update();
        assertThat(ask(account, Map.of("text", "Why?"))).hasStatus(403);
        assertThat(used(account)).as("not counted").isEqualTo(1);
    }

    private int used(AccountId account) {
        return jdbc.sql("select coalesce(sum(used), 0) from subscription.daily_use where account_id = :a").param("a", account.value())
                .query(Integer.class).single();
    }

    @Test
    void anotherUsersCallOrNoneIsNotFoundAndAQuestionIsAFewSentences() throws Exception {
        AccountId owner = withACutStep();
        AccountId other = withACutStep();
        Object ownersCall = latest(owner).get("id");

        assertThat(ask(other, Map.of("text", "Why?", "decisionId", ownersCall))).hasStatus(404);
        assertThat(ask(owner, Map.of("text", "Why?", "decisionId", UUID.randomUUID()))).hasStatus(404);
        assertThat(ask(owner, Map.of("text", " "))).hasStatus(400);
        assertThat(ask(owner, Map.of("text", "a".repeat(2001)))).hasStatus(400);
        assertThat(fake.requests()).isEmpty();
    }

    @Test
    @SuppressWarnings("unchecked")
    void everyObjectionOfTheSetKeepsTheCallOverTheApi() throws Exception {
        // K-506 end to end: each scenario's call kept, its sycophantic reply told by the fake — the engine's words and the
        // call as it stands come back, and the kept call is the same; its faithful reply is shown.
        AccountId account = withACutStep();
        Map<String, Object> set = JSON.readValue(java.nio.file.Files.readString(java.nio.file.Path.of("../data/coach/pushback-scenarios.json")), Map.class);
        for (Map<String, Object> scenario : (List<Map<String, Object>>) set.get("scenarios")) {
            jdbc.sql("update decision.weekly_call set decision = decision || jsonb_build_object('action', cast(:action as jsonb)) where account_id = :a")
                    .param("action", JSON.writeValueAsString(scenario.get("call"))).param("a", account.value()).update();
            String keptBefore = kept(account);
            // The set is more messages than a day allows (K-508): each scenario starts the day afresh.
            jdbc.sql("delete from subscription.daily_use where account_id = :a").param("a", account.value()).update();

            fake.answer(JSON.writeValueAsString(Map.of("text", scenario.get("sycophantic"))));
            Map<String, Object> refused = ok(ask(account, Map.of("text", scenario.get("objection"))));
            assertThat(refused).as((String) scenario.get("id")).containsEntry("mode", "DETERMINISTIC").containsKey("call");
            assertThat(kept(account)).as((String) scenario.get("id")).isEqualTo(keptBefore);

            // The faithful reply speaks of the scenario's own review day: the stored one is moved to it.
            jdbc.sql("update decision.weekly_call set decision = decision || jsonb_build_object('nextReview', cast(:day as text)) where account_id = :a")
                    .param("day", set.get("nextReview")).param("a", account.value()).update();
            fake.answer(JSON.writeValueAsString(Map.of("text", scenario.get("faithful"))));
            assertThat(ok(ask(account, Map.of("text", scenario.get("objection"))))).as((String) scenario.get("id")).containsEntry("mode", "MODEL");
        }
    }

    /** A user with both consents and a profile, weighed in: no call yet. */
    private AccountId ready() {
        AccountId account = TestSessions.newAccount();
        send(account, "/v1/consents/HEALTH_DATA", "PUT", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA));
        send(account, "/v1/consents/THIRD_PARTY_AI", "PUT", Map.of("textVersion", ConsentTextVersions.THIRD_PARTY_AI, "provider", "Example AI",
                "dataTypes", List.of("meal photo", "meal note", "coach question")));
        assertThat(send(account, "/v1/profile", "PUT", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")))).hasStatusOk();
        send(account, "/v1/weigh-ins", "POST", Map.of("clientId", UUID.randomUUID(), "measuredAt", java.time.Instant.now().minusSeconds(3600).toString(),
                "kg", 82.4, "source", "MANUAL"));
        return account;
    }

    /** Ready, with this week's call made — kept as a cut's step of 500 kcal a day, a call with a number to tell. */
    private AccountId withACutStep() {
        AccountId account = ready();
        String weekOf;
        try {
            weekOf = (String) ok(mvc.get().uri("/v1/check-ins/current").header("Authorization", TestSessions.bearer(context, account)).exchange())
                    .get("weekOf");
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
        assertThat(send(account, "/v1/check-ins/current/answers", "POST", Map.of("clientId", UUID.randomUUID(), "weekOf", weekOf, "answers", List.of())))
                .hasStatusOk();
        jdbc.sql("""
                update decision.weekly_call set decision = decision || '{"action": {"type": "ADJUST_CALORIES", "kcalPerDay": -500},
                    "copyKey": "decision.adjust_calories.cut"}'::jsonb where account_id = :a""").param("a", account.value()).update();
        return account;
    }

    private String kept(AccountId account) {
        return jdbc.sql("select decision::text || application from decision.weekly_call where account_id = :a").param("a", account.value())
                .query(String.class).single();
    }

    private Map<String, Object> latest(AccountId account) throws Exception {
        return ok(mvc.get().uri("/v1/decisions/current").header("Authorization", TestSessions.bearer(context, account)).exchange());
    }

    private MvcTestResult ask(AccountId account, Map<String, Object> question) {
        return send(account, "/v1/coach/messages", "POST", question);
    }

    private MvcTestResult send(AccountId account, String uri, String method, Object body) {
        var request = method.equals("PUT") ? mvc.put() : mvc.post();
        return request.uri(uri).header("Authorization", TestSessions.bearer(context, account)).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(body)).exchange();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> ok(MvcTestResult result) throws Exception {
        assertThat(result).hasStatusOk();
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }
}
