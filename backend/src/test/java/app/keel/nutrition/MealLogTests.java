package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * Meals and the day's budget (K-209, contract /v1/meals, /v1/days/{day}/budget): a meal is stored with its ranges as
 * they were estimated then; "same as yesterday" logs an earlier meal again; the budget is the day's target minus the
 * eaten range. Meals are health data: HEALTH_DATA consent (ADR-026).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({PostgresTestConfiguration.class, MealLogTests.Targets.class})
class MealLogTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @BeforeEach
    void foods() {
        jdbc.sql("""
                insert into nutrition.food (id, name, source, kcal, protein_g, carbs_g, fat_g) values
                ('fdc:171477', 'Chicken breast, roasted', 'FOUNDATION', 165, 31, 0, 3.6),
                ('fdc:1897574', 'Toasted oat cereal', 'BRANDED', 400, 10, 70, 8) on conflict (id) do nothing""").update();
    }

    @Test
    void aMealIsStoredOncePerClientIdWithItsRanges() throws Exception {
        AccountId account = consenting();
        Map<String, Object> meal = meal(UUID.randomUUID(), "2026-09-30T12:30:00Z", "LUNCH");

        MvcTestResult first = send(account, "POST", "/v1/meals", meal);
        MvcTestResult again = send(account, "POST", "/v1/meals", meal);

        assertThat(first).hasStatus(201);
        assertThat(again).hasStatus(200);
        assertThat(map(again)).isEqualTo(map(first));
        assertThat(map(first)).containsEntry("slot", "LUNCH").containsEntry("kcal", Map.of("low", 372, "high", 742))
                .containsEntry("proteinG", Map.of("low", 55, "high", 81));
        assertThat((List<Map<String, Object>>) map(first).get("items")).extracting(item -> item.get("name"))
                .containsExactly("Chicken breast, roasted", "Toasted oat cereal");
        assertThat(list(send(account, "GET", "/v1/meals?day=2026-09-30", null))).hasSize(1);
    }

    @Test
    void sameAsYesterdayLogsTheEarlierMealAgain() throws Exception {
        AccountId account = consenting();
        String yesterday = (String) map(send(account, "POST", "/v1/meals", meal(UUID.randomUUID(), "2026-09-29T08:00:00Z", "BREAKFAST"))).get("id");

        MvcTestResult repeated = send(account, "POST", "/v1/meals", Map.of("clientId", UUID.randomUUID(), "eatenAt", "2026-09-30T08:05:00Z",
                "slot", "BREAKFAST", "repeatOf", yesterday));

        assertThat(repeated).hasStatus(201);
        assertThat(map(repeated)).containsEntry("kcal", Map.of("low", 372, "high", 742)).isNotEqualTo(yesterday);
        assertThat(list(send(account, "GET", "/v1/meals?day=2026-09-30", null))).hasSize(1);
    }

    @Test
    void aMealIsItemsOrARepeatAndOnlyOfTheUsersOwnMeals() throws Exception {
        AccountId account = consenting();
        AccountId someone = consenting();
        String theirs = (String) map(send(someone, "POST", "/v1/meals", meal(UUID.randomUUID(), "2026-09-29T08:00:00Z", "BREAKFAST"))).get("id");
        Map<String, Object> both = new HashMap<>(meal(UUID.randomUUID(), "2026-09-30T08:00:00Z", "BREAKFAST"));
        both.put("repeatOf", theirs);

        assertThat(send(account, "POST", "/v1/meals", both)).as("items and a repeat").hasStatus(400);
        assertThat(send(account, "POST", "/v1/meals", Map.of("clientId", UUID.randomUUID(), "eatenAt", "2026-09-30T08:00:00Z",
                "slot", "BREAKFAST"))).as("neither").hasStatus(400);
        assertThat(send(account, "POST", "/v1/meals", Map.of("clientId", UUID.randomUUID(), "eatenAt", "2026-09-30T08:00:00Z",
                "slot", "BREAKFAST", "repeatOf", theirs))).as("someone else's meal").hasStatus(404);
    }

    @Test
    void mealsAreHealthDataAndNeedTheConsent() {
        AccountId account = TestSessions.newAccount();

        assertThat(send(account, "POST", "/v1/meals", meal(UUID.randomUUID(), "2026-09-30T12:30:00Z", "LUNCH"))).hasStatus(403);
        assertThat(send(account, "GET", "/v1/meals?day=2026-09-30", null)).hasStatus(403);
        assertThat(send(account, "GET", "/v1/days/2026-09-30/budget", null)).hasStatus(403);
    }

    @Test
    void aDeletedMealIsGone() throws Exception {
        AccountId account = consenting();
        String id = (String) map(send(account, "POST", "/v1/meals", meal(UUID.randomUUID(), "2026-09-30T12:30:00Z", "LUNCH"))).get("id");

        assertThat(send(account, "DELETE", "/v1/meals/" + id, null)).hasStatus(204);
        assertThat(send(account, "DELETE", "/v1/meals/" + id, null)).hasStatus(404);
        assertThat(list(send(account, "GET", "/v1/meals?day=2026-09-30", null))).isEmpty();
    }

    @Test
    void aMealBelongsToTheUsersLocalDay() throws Exception {
        AccountId account = consenting();
        send(account, "PUT", "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "Europe/Istanbul")));

        // 22:30 UTC on the 30th is 01:30 on the 1st in Istanbul.
        send(account, "POST", "/v1/meals", meal(UUID.randomUUID(), "2026-09-30T22:30:00Z", "SNACK"));

        assertThat(list(send(account, "GET", "/v1/meals?day=2026-09-30", null))).isEmpty();
        assertThat(list(send(account, "GET", "/v1/meals?day=2026-10-01", null))).hasSize(1);
    }

    @Test
    void theBudgetIsTheTargetMinusTheDaysMeals() throws Exception {
        AccountId account = consenting();
        Targets.WITH_TARGETS.add(account);
        send(account, "POST", "/v1/meals", meal(UUID.randomUUID(), "2026-09-30T12:30:00Z", "LUNCH"));
        send(account, "POST", "/v1/meals", meal(UUID.randomUUID(), "2026-09-29T12:30:00Z", "LUNCH"));   // another day

        Map<String, Object> budget = map(send(account, "GET", "/v1/days/2026-09-30/budget", null));

        assertThat(budget).containsEntry("day", "2026-09-30").containsEntry("targetKcal", 2200)
                .containsEntry("left", Map.of("kcal", Map.of("low", 1458, "high", 1828), "proteinG", Map.of("low", 79, "high", 105)));
        assertThat((Map<String, Object>) budget.get("eaten")).containsEntry("kcal", Map.of("low", 372, "high", 742));
    }

    @Test
    void noTargetYetIsNoBudget() {
        assertThat(send(consenting(), "GET", "/v1/days/2026-09-30/budget", null)).hasStatus(404);
    }

    private AccountId consenting() {
        AccountId account = TestSessions.newAccount();
        assertThat(send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", "1-draft"))).hasStatusOk();
        return account;
    }

    private static Map<String, Object> meal(UUID clientId, String eatenAt, String slot) {
        return Map.of("clientId", clientId, "eatenAt", eatenAt, "slot", slot, "items", List.of(
                Map.of("foodId", "fdc:171477", "amount", Map.of("quantity", 200, "unit", "g", "certainty", "WEIGHED")),
                Map.of("foodId", "fdc:1897574", "amount", Map.of("quantity", 50, "unit", "g"))));
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

    private static Map<String, Object> map(MvcTestResult result) throws Exception {
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }

    private static List<Map<String, Object>> list(MvcTestResult result) throws Exception {
        return JSON.readValue(result.getResponse().getContentAsString(), List.class);
    }

    /** The day's targets as decision will give them (K-216): 2200 kcal, 160 g protein, for the accounts a test names. */
    @TestConfiguration(proxyBeanMethods = false)
    static class Targets {

        static final Set<AccountId> WITH_TARGETS = ConcurrentHashMap.newKeySet();

        @Bean
        DailyTargets dailyTargets() {
            return (account, day) -> WITH_TARGETS.contains(account) ? Optional.of(new DailyTargets.Targets(2200, 160)) : Optional.empty();
        }
    }
}
