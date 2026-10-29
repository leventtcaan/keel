package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
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
import tools.jackson.databind.json.JsonMapper;

/**
 * The food search for US users (K-1061, ADR-090 #1, #5; POST /v1/foods/search, /v1/foods/barcode-lookup, /v1/food-estimates):
 * generic foods for generic words, products for brand words, plurals, prefixes and typos, the user's region first, the user's own
 * logs and everyone's, the barcode, and the portions every result carries. The foods are test rows (id "k1061:..."); the database
 * is shared across test classes, so only these are looked at.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class FoodUsSearchTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final String MINE = "k1061:";

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @BeforeEach
    void foods() {
        food("egg", "Egg, whole, raw", null, "FOUNDATION", "US", null, "143");
        food("eggs-brand", "Eggs", "Kirkland", "BRANDED", "US", null, "143");
        food("eggland", "Eggland's Best Large Eggs", "Eggland's Best", "BRANDED", "US", null, "143");
        food("banana", "Bananas, raw", null, "SR_LEGACY", "US", null, "89");
        food("chicken", "Chicken, breast, raw", null, "FOUNDATION", "US", null, "120");
        food("yogurt", "Greek Yogurt, Strawberry", "Chobani", "BRANDED", "US", "00036000291452", "88");
        food("granola", "Granola", null, "FOUNDATION", "US", null, "471");
        food("granola-bar", "Granola bar, chewy", null, "SR_LEGACY", "US", null, "420");
        food("kefir-us", "Kefir plain", "Lifeway", "BRANDED", "US", null, "60");
        food("kefir-tr", "Kefir plain", "Pınar", "BRANDED", "TR", null, "60");
        food("rice", "Rice, white, cooked", null, "SR_LEGACY", "US", null, "130");
        serving("egg", 1, "1 extra large", "56");
        serving("egg", 2, "1 large", "50");
        serving("egg", 3, "1 medium", "44");
        serving("egg", 4, "1 small", "38");
        serving("egg", 5, "1 cup", "243");
        serving("yogurt", 1, "1 container (150g)", "150");
        serving("rice", 1, "1 cup", "158");
    }

    @AfterEach
    void noFoodLeftForOtherTests() {
        jdbc.sql("delete from nutrition.meal where day = '1999-12-30'").update();
        jdbc.sql("delete from nutrition.food where id like 'k1061:%'").update();
    }

    @Test
    void theEggIsFoundBeforeTheProductsCalledEggsForAGenericWord() throws Exception {
        assertThat(ids(found("egg", "en-US", account()))).startsWith("egg");
        assertThat(ids(found("egg", "en-US", account()))).contains("eggs-brand", "eggland");
    }

    @Test
    void aBrandWordFindsTheProduct() throws Exception {
        assertThat(ids(found("chobani", "en-US", account()))).containsExactly("yogurt");
        assertThat(ids(found("chobani strawberry", "en-US", account()))).containsExactly("yogurt");
        assertThat(ids(found("eggland", "en-US", account()))).containsExactly("eggland");
    }

    @Test
    void aPluralAPrefixAndAnyPartOfAWordFindTheFood() throws Exception {
        assertThat(ids(found("eggs", "en-US", account()))).contains("egg");
        assertThat(ids(found("bananas", "en-US", account()))).containsExactly("banana");
        assertThat(ids(found("banan", "en-US", account()))).containsExactly("banana");
        assertThat(ids(found("chick", "en-US", account()))).containsExactly("chicken");
    }

    @Test
    void aSmallTypoFindsTheFoodAfterTheExactOnes() throws Exception {
        assertThat(ids(found("bananna", "en-US", account()))).containsExactly("banana");
        assertThat(ids(found("chiken breast", "en-US", account()))).containsExactly("chicken");
        // The exact matches of a word come before a food only spelled alike.
        assertThat(ids(found("eggland", "en-US", account()))).first().isEqualTo("eggland");
    }

    @Test
    void theUsersRegionComesFirst() throws Exception {
        assertThat(ids(found("kefir", "en-US", account()))).containsExactly("kefir-us", "kefir-tr");
        assertThat(ids(found("kefir", "tr-TR", account()))).containsExactly("kefir-tr", "kefir-us");
        assertThat(ids(found("kefir", null, account()))).as("no header: the text decides").containsExactlyInAnyOrder("kefir-us", "kefir-tr");
    }

    @Test
    void theFoodsTheUserLogsComeFirstForThem() throws Exception {
        AccountId mine = account();
        AccountId other = account();
        for (int i = 0; i < 5; i++) {
            log(mine.value(), "granola-bar");
        }

        // "Granola" is the better name; the user who has the bar five times gets the bar first.
        assertThat(ids(found("granola", "en-US", mine))).containsExactly("granola-bar", "granola");
        assertThat(ids(found("granola", "en-US", other))).containsExactly("granola", "granola-bar");
    }

    @Test
    void theFoodsEveryoneLogsComeBeforeTheRareOnesOfTheSameText() throws Exception {
        AccountId someone = account();
        // Same text, same type, no region asked: the order is the database's tie-break (the shorter name, then the id).
        assertThat(ids(found("kefir plain", null, someone))).containsExactly("kefir-tr", "kefir-us");
        for (int i = 0; i < 40; i++) {
            log(UUID.randomUUID(), "kefir-us");
        }

        assertThat(ids(found("kefir plain", null, someone))).containsExactly("kefir-us", "kefir-tr");
    }

    @Test
    void everyResultCarriesItsPortionsAndWhereToStart() throws Exception {
        Map<String, Object> egg = byId(found("egg", "en-US", account()), "egg");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> portions = (List<Map<String, Object>>) egg.get("portions");
        assertThat(portions.stream().map(portion -> portion.get("unit")).toList()).containsExactly("1 large", "1 extra large", "1 medium", "1 small", "1 cup", "g", "oz");
        assertThat(egg.get("defaultAmount")).isEqualTo(Map.of("quantity", 1, "unit", "1 large"));
        // 143 kcal a hundred grams, 50 g: one number for the portion (the ranges stay in per100g).
        assertThat(((Number) portions.getFirst().get("kcal")).doubleValue()).isEqualTo(71.5);
        assertThat(portions.getFirst().get("kind")).isEqualTo("PIECE");
        assertThat(egg).containsKey("per100g").containsKey("servings");
    }

    @Test
    void aProductStartsAtItsLabelServingAndAFoodWithNoMeasureAtAHundredGrams() throws Exception {
        Map<String, Object> yogurt = byId(found("chobani", "en-US", account()), "yogurt");
        Map<String, Object> chicken = byId(found("chicken", "en-US", account()), "chicken");

        assertThat(yogurt.get("defaultAmount")).isEqualTo(Map.of("quantity", 1, "unit", "1 container (150g)"));
        assertThat(chicken.get("defaultAmount")).isEqualTo(Map.of("quantity", 100, "unit", "g"));
    }

    @Test
    void theBarcodeIsFoundInTheDatabaseAndAnUnknownOneIsNotFound() throws Exception {
        AccountId account = account();

        var found = mvc.post().uri("/v1/foods/barcode-lookup").header("Authorization", TestSessions.bearer(context, account))
                .header("Accept-Language", "en-US").contentType(MediaType.APPLICATION_JSON).content("{\"gtin\":\"036000291452\"}").exchange();
        var missing = mvc.post().uri("/v1/foods/barcode-lookup").header("Authorization", TestSessions.bearer(context, account))
                .contentType(MediaType.APPLICATION_JSON).content("{\"gtin\":\"4006381333931\"}").exchange();

        assertThat(found).hasStatusOk();
        @SuppressWarnings("unchecked")
        Map<String, Object> food = JSON.readValue(found.getResponse().getContentAsString(), Map.class);
        assertThat(food.get("id")).isEqualTo(MINE + "yogurt");
        assertThat(food.get("brand")).isEqualTo("Chobani");
        assertThat(food).containsKey("portions");
        assertThat(missing).as("a valid EAN-13 no database has").hasStatus(404);
    }

    @Test
    void anOunceIsAWeightTheEstimateTakes() throws Exception {
        AccountId account = account();

        Map<?, ?> ounces = estimate(account, MINE + "rice", 4, "oz");
        Map<?, ?> grams = estimate(account, MINE + "rice", 113.4, "g");

        // 4 oz = 113.398 g: the range of 113.4 g to the calorie, with the same certainty (a weight on a scale or by eye).
        Map<?, ?> inOunces = (Map<?, ?>) ounces.get("kcal");
        Map<?, ?> inGrams = (Map<?, ?>) grams.get("kcal");
        int low = ((Number) inGrams.get("low")).intValue();
        int high = ((Number) inGrams.get("high")).intValue();
        assertThat(((Number) inOunces.get("low")).intValue()).isBetween(low - 1, low + 1);
        assertThat(((Number) inOunces.get("high")).intValue()).isBetween(high - 1, high + 1);
    }

    @Test
    void aPortionUnitIsAnAmountTheEstimateTakesBack() throws Exception {
        AccountId account = account();

        Map<?, ?> estimate = estimate(account, MINE + "egg", 2, "1 large");

        // Two large eggs of 50 g, 143 kcal a hundred grams: about 143 in the middle of the range.
        Map<?, ?> kcal = (Map<?, ?>) estimate.get("kcal");
        assertThat(((Number) kcal.get("low")).intValue()).isLessThan(143);
        assertThat(((Number) kcal.get("high")).intValue()).isGreaterThan(143);
    }

    private static Map<String, Object> byId(List<Map<String, Object>> foods, String number) {
        return foods.stream().filter(food -> food.get("id").equals(MINE + number)).findFirst().orElseThrow();
    }

    private static AccountId account() {
        return TestSessions.newAccount();
    }

    private Map<?, ?> estimate(AccountId account, String foodId, Number quantity, String unit) throws Exception {
        String body = JSON.writeValueAsString(Map.of("items", List.of(Map.of("foodId", foodId, "amount", Map.of("quantity", quantity, "unit", unit)))));
        var result = mvc.post().uri("/v1/food-estimates").header("Authorization", TestSessions.bearer(context, account))
                .contentType(MediaType.APPLICATION_JSON).content(body).exchange();
        assertThat(result).hasStatusOk();
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }

    /** The ids (without the prefix) of this class's rows the search returns, in the order returned. */
    private List<String> ids(List<Map<String, Object>> foods) {
        return foods.stream().map(food -> (String) food.get("id")).filter(id -> id.startsWith(MINE)).map(id -> id.substring(MINE.length())).toList();
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> found(String query, String language, AccountId account) throws Exception {
        var request = mvc.post().uri("/v1/foods/search").header("Authorization", TestSessions.bearer(context, account))
                .contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(Map.of("q", query, "limit", 50)));
        if (language != null) {
            request = request.header("Accept-Language", language);
        }
        var result = request.exchange();
        assertThat(result).hasStatusOk();
        return JSON.readValue(result.getResponse().getContentAsString(), List.class);
    }

    private void food(String number, String name, String brand, String source, String region, String gtin, String kcal) {
        jdbc.sql("""
                insert into nutrition.food (id, name, brand, source, kcal, protein_g, carbs_g, fat_g, gtin, region)
                values (:id, :name, :brand, :source, :kcal, 5, 10, 2, :gtin, :region) on conflict (id) do nothing""")
                .param("id", MINE + number).param("name", name).param("brand", brand).param("source", source).param("kcal", new java.math.BigDecimal(kcal))
                .param("gtin", gtin).param("region", region).update();
    }

    private void serving(String food, int seq, String name, String grams) {
        jdbc.sql("insert into nutrition.food_serving (food_id, seq, name, grams) values (:food, :seq, :name, :grams) on conflict do nothing")
                .param("food", MINE + food).param("seq", seq).param("name", name).param("grams", new java.math.BigDecimal(grams)).update();
    }

    /** One logged item of the food, as a meal of the account on a day of 1999 (cleaned up after). */
    private void log(UUID account, String food) {
        UUID meal = UUID.randomUUID();
        jdbc.sql("""
                insert into nutrition.meal (id, account_id, client_id, eaten_at, day, slot) values (:meal, :account, :client, '1999-12-30T12:00:00Z', '1999-12-30', 'SNACK')""")
                .param("meal", meal).param("account", account).param("client", UUID.randomUUID()).update();
        jdbc.sql("""
                insert into nutrition.meal_item (meal_id, account_id, seq, food_id, name, quantity, unit, kcal_low, kcal_high, protein_low, protein_high,
                carbs_low, carbs_high, fat_low, fat_high) values (:meal, :account, 1, :food, 'x', 100, 'g', 100, 110, 0, 0, 25, 27, 0, 0)""")
                .param("meal", meal).param("account", account).param("food", MINE + food).update();
    }
}
