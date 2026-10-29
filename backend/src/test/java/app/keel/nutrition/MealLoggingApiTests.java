package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
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
 * Logging a meal and finding it again (K-1063, ADR-090 Ek 3): a meal changed in place (items, slot, moment), a quick add, the user's
 * own food (search, barcode, estimate, privacy), starred foods, the most logged foods, and the meals and days of a range. The dates
 * are relative to now; a user without a profile lives on UTC, so a meal at noon UTC is that day whatever hour the test runs at.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class MealLoggingApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String CHICKEN = "fdc:k1063-chicken";
    private static final String CEREAL = "fdc:k1063-cereal";
    // A UPC-A with a valid check digit (GS1's own example).
    private static final String BARCODE = "012345678905";

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
                ('fdc:k1063-chicken', 'K1063 chicken breast, roasted', 'FOUNDATION', 165, 31, 0, 3.6),
                ('fdc:k1063-cereal', 'K1063 toasted oat cereal', 'BRANDED', 400, 10, 70, 8) on conflict (id) do nothing""").update();
    }

    @Test
    void aMealIsChangedInPlaceAndKeepsItsIdAndItsClient() throws Exception {
        AccountId account = consenting();
        Map<String, Object> logged = meal(account, 1, "LUNCH", CHICKEN, 200);
        String id = (String) logged.get("id");

        Map<String, Object> changed = body(send(account, "PATCH", "/v1/meals/" + id, Map.of("items", items(CHICKEN, 100))));

        assertThat(changed).containsEntry("id", id).containsEntry("clientId", logged.get("clientId"));
        assertThat(kcalHigh(changed)).as("half the chicken, about half the energy").isLessThan(kcalHigh(logged));
        List<Map<String, Object>> day = list(send(account, "GET", "/v1/meals?day=" + date(1), null));
        assertThat(day).as("one meal, changed — not a second").hasSize(1);
        assertThat(day.getFirst()).containsEntry("id", id);
    }

    @Test
    void aMealMovesToAnotherSlotAndAnotherDay() throws Exception {
        AccountId account = consenting();
        String id = (String) meal(account, 1, "LUNCH", CHICKEN, 200).get("id");

        Map<String, Object> moved = body(send(account, "PATCH", "/v1/meals/" + id,
                Map.of("slot", "DINNER", "eatenAt", noon(5).toString())));

        assertThat(moved).containsEntry("slot", "DINNER");
        assertThat(list(send(account, "GET", "/v1/meals?day=" + date(1), null))).isEmpty();
        assertThat(list(send(account, "GET", "/v1/meals?day=" + date(5), null))).extracting(m -> m.get("id")).containsExactly(id);
    }

    @Test
    void anEmptyChangeAndAnotherUsersMealAreRefused() throws Exception {
        AccountId mine = consenting();
        AccountId other = consenting();
        String id = (String) meal(mine, 1, "LUNCH", CHICKEN, 200).get("id");

        assertThat(send(mine, "PATCH", "/v1/meals/" + id, Map.of())).hasStatus(400);
        assertThat(send(other, "PATCH", "/v1/meals/" + id, Map.of("slot", "DINNER"))).hasStatus(404);
        assertThat(send(mine, "PATCH", "/v1/meals/" + id, Map.of("items", items("fdc:nothing-like-this", 100)))).hasStatus(400);
        assertThat(list(send(mine, "GET", "/v1/meals?day=" + date(1), null))).as("a refused change leaves the meal as it was").hasSize(1);
    }

    @Test
    void aQuickAddIsExactAndNeverOfferedAgain() throws Exception {
        AccountId account = consenting();
        Map<String, Object> quick = Map.of("foodId", "quick", "amount", Map.of("quantity", 1, "unit", "serving"),
                "quick", Map.of("kcal", 300, "proteinG", 20));

        assertThat(send(account, "POST", "/v1/meals", Map.of("clientId", UUID.randomUUID(), "eatenAt", noon(0).toString(), "slot", "SNACK",
                "items", List.of(quick)))).hasStatus(201);

        List<Map<String, Object>> day = list(send(account, "GET", "/v1/meals?day=" + date(0), null));
        assertThat(day).singleElement().satisfies(meal -> {
            assertThat(kcalLow(meal)).isEqualTo(300);
            assertThat(kcalHigh(meal)).as("typed numbers are exact").isEqualTo(300);
        });
        assertThat(list(send(account, "GET", "/v1/foods/recent", null))).isEmpty();
        assertThat(list(send(account, "GET", "/v1/foods/frequent", null))).isEmpty();
        assertThat(send(account, "POST", "/v1/food-estimates", Map.of("items", List.of(Map.of("foodId", "quick",
                "amount", Map.of("quantity", 1, "unit", "serving")))))).as("no numbers, no quick add").hasStatus(400);
    }

    @Test
    void anOwnFoodIsFoundByNameAndBarcodeLoggedAndSeenByNoOneElse() throws Exception {
        AccountId account = consenting();
        AccountId other = consenting();

        Map<String, Object> created = body(send(account, "POST", "/v1/foods", Map.of("name", "Zorkmid protein bar", "brand", "Zork",
                "gtin", BARCODE, "servingGrams", 50, "kcal", 200, "proteinG", 20, "carbsG", 20, "fatG", 6)));

        String id = (String) created.get("id");
        assertThat(id).startsWith("own:");
        assertThat(created).containsEntry("own", true);
        assertThat(created).containsKey("portions");
        assertThat(created.get("defaultAmount")).isEqualTo(Map.of("quantity", 1, "unit", "1 serving (50 g)"));
        assertThat(list(send(account, "POST", "/v1/foods/search", Map.of("q", "zorkmid"))))
                .extracting(food -> food.get("id")).as("by name, first").startsWith(id);
        assertThat(body(send(account, "POST", "/v1/foods/barcode-lookup", Map.of("gtin", BARCODE)))).containsEntry("id", id);
        assertThat(list(send(other, "POST", "/v1/foods/search", Map.of("q", "zorkmid")))).isEmpty();
        assertThat(send(other, "POST", "/v1/foods/barcode-lookup", Map.of("gtin", BARCODE))).hasStatus(404);
        assertThat(send(other, "POST", "/v1/food-estimates", Map.of("items", items(id, 50)))).as("not another's food").hasStatus(400);

        Map<String, Object> estimate = body(send(account, "POST", "/v1/food-estimates",
                Map.of("items", List.of(Map.of("foodId", id, "amount", Map.of("quantity", 2, "unit", "1 serving (50 g)"))))));
        // Two servings of 200 kcal: 400 within the label's tolerance.
        assertThat(kcalLow(estimate)).isLessThanOrEqualTo(400);
        assertThat(kcalHigh(estimate)).isGreaterThanOrEqualTo(400);
    }

    @Test
    void oneFoodIsReadWithItsPortionsAndAnotherUsersOwnFoodIsNotThere() throws Exception {
        AccountId account = consenting();
        AccountId other = consenting();
        String own = (String) body(send(account, "POST", "/v1/foods", Map.of("name", "Quark pot", "servingGrams", 150, "kcal", 90, "proteinG", 15,
                "carbsG", 6, "fatG", 0.5))).get("id");

        assertThat(body(send(account, "GET", "/v1/foods/" + CHICKEN, null))).containsEntry("id", CHICKEN).containsKey("portions");
        assertThat(body(send(account, "GET", "/v1/foods/" + own, null))).containsEntry("own", true);
        assertThat(send(other, "GET", "/v1/foods/" + own, null)).hasStatus(404);
        assertThat(send(account, "GET", "/v1/foods/fdc:not-a-food", null)).hasStatus(404);
    }

    @Test
    void anOwnFoodThatCannotBeRealIsRefused() {
        AccountId account = consenting();

        assertThat(send(account, "POST", "/v1/foods", Map.of("name", "Too rich", "servingGrams", 30, "kcal", 5000, "proteinG", 1, "carbsG", 1,
                "fatG", 1))).as("5000 kcal in 30 g").hasStatus(400);
        assertThat(send(account, "POST", "/v1/foods", Map.of("name", "Too heavy", "servingGrams", 30, "kcal", 100, "proteinG", 40, "carbsG", 40,
                "fatG", 40))).as("120 g of macros in 30 g").hasStatus(400);
        assertThat(send(account, "POST", "/v1/foods", Map.of("name", " ", "servingGrams", 30, "kcal", 100, "proteinG", 1, "carbsG", 1, "fatG", 1)))
                .as("no name").hasStatus(400);
        assertThat(send(account, "POST", "/v1/foods", Map.of("name", "Bad code", "gtin", "012345678906", "servingGrams", 30, "kcal", 100,
                "proteinG", 1, "carbsG", 1, "fatG", 1))).as("a wrong check digit").hasStatus(400);
        assertThat(send(TestSessions.newAccount(), "POST", "/v1/foods", Map.of("name", "No consent", "servingGrams", 30, "kcal", 100,
                "proteinG", 1, "carbsG", 1, "fatG", 1))).hasStatus(403);
    }

    @Test
    void anOwnFoodsNumbersAreJudgedByTheirShapeBeforeAnyArithmetic() {
        // Security review: 1E+1000000 or fifty decimals must cost nothing to refuse — no division, no sum on them.
        AccountId account = consenting();
        java.math.BigDecimal huge = new java.math.BigDecimal("1E+1000000");
        java.math.BigDecimal fifty = new java.math.BigDecimal("1." + "1".repeat(50));
        Map<String, Object> fine = Map.of("name", "Shape test", "servingGrams", 30, "kcal", 100, "proteinG", 1, "carbsG", 1, "fatG", 1);

        for (String field : List.of("servingGrams", "kcal", "proteinG", "carbsG", "fatG")) {
            for (Object bad : List.of(huge, fifty, new java.math.BigDecimal("-1"), new java.math.BigDecimal("1E-1000000"))) {
                Map<String, Object> food = new java.util.HashMap<>(fine);
                food.put(field, bad);
                assertThat(send(account, "POST", "/v1/foods", food)).as(field + " = " + bad.toString().substring(0, Math.min(12, bad.toString().length())))
                        .hasStatus(400);
            }
        }
        Map<String, Object> zero = new java.util.HashMap<>(fine);
        zero.put("servingGrams", 0);
        assertThat(send(account, "POST", "/v1/foods", zero)).as("a serving that weighs nothing").hasStatus(400);
        Map<String, Object> missing = new java.util.HashMap<>(fine);
        missing.remove("kcal");
        assertThat(send(account, "POST", "/v1/foods", missing)).as("a number left out").hasStatus(400);
        assertThat(send(account, "POST", "/v1/foods", fine)).as("the same food with sane numbers").hasStatus(201);
    }

    @Test
    void aFoodIsStarredAndUnstarred() throws Exception {
        AccountId account = consenting();
        AccountId other = consenting();

        assertThat(send(account, "PUT", "/v1/foods/" + CHICKEN + "/favorite", null)).hasStatus(204);
        assertThat(send(account, "PUT", "/v1/foods/" + CEREAL + "/favorite", null)).hasStatus(204);
        assertThat(send(account, "PUT", "/v1/foods/" + CEREAL + "/favorite", null)).as("again is the same").hasStatus(204);

        assertThat(list(send(account, "GET", "/v1/foods/favorites", null))).extracting(food -> food.get("id")).containsExactly(CEREAL, CHICKEN);
        assertThat(list(send(account, "GET", "/v1/foods/favorites", null)).getFirst()).containsKey("portions");
        assertThat(list(send(other, "GET", "/v1/foods/favorites", null))).isEmpty();
        assertThat(send(account, "DELETE", "/v1/foods/" + CEREAL + "/favorite", null)).hasStatus(204);
        assertThat(list(send(account, "GET", "/v1/foods/favorites", null))).extracting(food -> food.get("id")).containsExactly(CHICKEN);
        assertThat(send(account, "PUT", "/v1/foods/fdc:not-a-food/favorite", null)).hasStatus(400);
    }

    @Test
    void theMostLoggedFoodComesFirstInItsUsualAmount() throws Exception {
        AccountId account = consenting();
        meal(account, 3, "LUNCH", CHICKEN, 200);
        meal(account, 2, "LUNCH", CHICKEN, 200);
        meal(account, 1, "SNACK", CEREAL, 50);

        List<Map<String, Object>> frequent = list(send(account, "GET", "/v1/foods/frequent", null));

        assertThat(frequent).extracting(item -> item.get("foodId")).containsExactly(CHICKEN, CEREAL);
        assertThat(frequent.getFirst()).containsKey("kcal");
    }

    @Test
    void aRangeOfDaysIsReadAsMealsAndAsDaySummaries() throws Exception {
        AccountId account = consenting();
        meal(account, 5, "LUNCH", CHICKEN, 200);
        meal(account, 5, "DINNER", CEREAL, 50);
        meal(account, 2, "LUNCH", CHICKEN, 100);

        List<Map<String, Object>> meals = list(send(account, "GET", "/v1/meals?from=" + date(6) + "&to=" + date(0), null));
        List<Map<String, Object>> days = list(send(account, "GET", "/v1/days?from=" + date(6) + "&to=" + date(0), null));

        assertThat(meals).hasSize(3).allSatisfy(meal -> assertThat(meal).containsKeys("carbsG", "fatG"));
        assertThat(days).extracting(day -> day.get("day")).as("only days with a meal, oldest first").containsExactly(date(5), date(2));
        assertThat(days.getFirst()).containsEntry("meals", 2).containsKey("eaten");
    }

    @Test
    void aRangeTooLongOrBothFormsAtOnceAreRefused() {
        AccountId account = consenting();

        assertThat(send(account, "GET", "/v1/meals?from=" + date(100) + "&to=" + date(0), null)).hasStatus(400);
        assertThat(send(account, "GET", "/v1/days?from=" + date(100) + "&to=" + date(0), null)).hasStatus(400);
        assertThat(send(account, "GET", "/v1/meals?day=" + date(0) + "&from=" + date(3) + "&to=" + date(0), null)).hasStatus(400);
        assertThat(send(account, "GET", "/v1/meals", null)).as("neither form").hasStatus(400);
        assertThat(send(account, "GET", "/v1/days?from=" + date(0) + "&to=" + date(3), null)).as("to before from").hasStatus(400);
        assertThat(send(TestSessions.newAccount(), "GET", "/v1/days?from=" + date(3) + "&to=" + date(0), null)).hasStatus(403);
    }

    @Test
    void aFoodTheProfileAvoidsIsMarkedInTheSearchNotHidden() throws Exception {
        AccountId account = consenting();
        assertThat(send(account, "PUT", "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC", "food", Map.of("avoid", List.of("cereal")),
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")))).hasStatusOk();

        List<Map<String, Object>> found = list(send(account, "POST", "/v1/foods/search", Map.of("q", "K1063 toasted")));

        assertThat(found).extracting(food -> food.get("id")).contains(CEREAL);
        assertThat(found.stream().filter(food -> CEREAL.equals(food.get("id"))).findFirst().orElseThrow()).containsEntry("avoided", true);
        assertThat(list(send(account, "POST", "/v1/foods/search", Map.of("q", "K1063 chicken"))).getFirst()).doesNotContainKey("avoided");
    }

    // ── helpers ─────────────────────────────────────────────────────────────────────────────────────────

    private AccountId consenting() {
        AccountId account = TestSessions.newAccount();
        assertThat(send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA))).hasStatusOk();
        return account;
    }

    private static String date(int daysAgo) {
        return LocalDate.now(ZoneOffset.UTC).minusDays(daysAgo).toString();
    }

    private static Instant noon(int daysAgo) {
        return LocalDate.now(ZoneOffset.UTC).minusDays(daysAgo).atTime(12, 0).toInstant(ZoneOffset.UTC);
    }

    private static List<Map<String, Object>> items(String food, int grams) {
        return List.of(Map.of("foodId", food, "amount", Map.of("quantity", grams, "unit", "g")));
    }

    /** A meal at noon UTC, {@code daysAgo} days back, of foods and grams in pairs. */
    private Map<String, Object> meal(AccountId account, int daysAgo, String slot, Object... foodAndGrams) throws Exception {
        List<Map<String, Object>> items = new ArrayList<>();
        for (int i = 0; i < foodAndGrams.length; i += 2) {
            items.addAll(items((String) foodAndGrams[i], (Integer) foodAndGrams[i + 1]));
        }
        MvcTestResult result = send(account, "POST", "/v1/meals",
                Map.of("clientId", UUID.randomUUID(), "eatenAt", noon(daysAgo).toString(), "slot", slot, "items", items));
        assertThat(result).hasStatus(201);
        return body(result);
    }

    @SuppressWarnings("unchecked")
    private static int kcalLow(Map<String, Object> withKcal) {
        return ((Number) ((Map<String, Object>) withKcal.get("kcal")).get("low")).intValue();
    }

    @SuppressWarnings("unchecked")
    private static int kcalHigh(Map<String, Object> withKcal) {
        return ((Number) ((Map<String, Object>) withKcal.get("kcal")).get("high")).intValue();
    }

    private MvcTestResult send(AccountId account, String method, String uri, Object body) {
        var request = switch (method) {
            case "GET" -> mvc.get();
            case "PUT" -> mvc.put();
            case "PATCH" -> mvc.patch();
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
    private static Map<String, Object> body(MvcTestResult result) throws Exception {
        assertThat(result.getResponse().getStatus()).isIn(200, 201);
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> list(MvcTestResult result) throws Exception {
        assertThat(result).hasStatusOk();
        return JSON.readValue(result.getResponse().getContentAsString(), List.class);
    }
}
