package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
 * Food and amount to ranges (K-208, U1, U5; contract /v1/foods/*, /v1/food-estimates): the number comes from the food
 * database (ADR-008: USDA FDC), never a language model; a barcode FDC does not have is a plain NOT_FOUND. The foods here
 * are test rows shaped like FDC's (the bulk import waits for its download approval, DURUM question 16).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class FoodMappingTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @BeforeEach
    void foods() {
        food("fdc:171477", "Chicken breast, roasted", null, "FOUNDATION", "165", "31", "0", "3.6", null, null);
        food("fdc:168878", "Rice, white, cooked", null, "SR_LEGACY", "130", "2.7", "28", "0.3", null, null);
        serving("fdc:168878", 0, "1 cup", "158");
        food("fdc:1897574", "Toasted oat cereal", "Cheerios", "BRANDED", "400", "10", "70", "8", "00016000275287", null);
        food("fdc:746782", "Milk, whole", null, "FOUNDATION", "61", "3.3", "4.8", "3.2", null, "1.03");
        food("fdc:999001", "Chicken nuggets", "Frozen Brand", "BRANDED", "280", "14", "16", "18", "00012345678905", null);
        food("fdc:999003", "Rice with chicken", null, "SR_LEGACY", "150", "8", "20", "4", null, null);
    }

    @Test
    void searchFindsEveryWordAndPutsNamesThatStartWithItFirst() throws Exception {
        List<Map<String, Object>> found = list(post("/v1/foods/search", Map.of("q", "chicken")));

        // Names that start with the word first, the shorter of those first; a name holding it elsewhere after them.
        assertThat(found).extracting(food -> food.get("id")).containsExactly("fdc:999001", "fdc:171477", "fdc:999003");
        assertThat(list(post("/v1/foods/search", Map.of("q", "chicken roasted")))).extracting(food -> food.get("id")).containsExactly("fdc:171477");
        assertThat(list(post("/v1/foods/search", Map.of("q", "cheerios")))).extracting(food -> food.get("id")).containsExactly("fdc:1897574");
    }

    @Test
    void aFoodComesWithItsValueAsRangesAndItsServings() throws Exception {
        Map<String, Object> rice = list(post("/v1/foods/search", Map.of("q", "rice white"))).getFirst();

        assertThat(rice).containsEntry("name", "Rice, white, cooked")
                .containsEntry("per100g", Map.of("kcal", Map.of("low", 117, "high", 143), "proteinG", Map.of("low", 2, "high", 3),
                        "carbsG", Map.of("low", 25, "high", 31), "fatG", Map.of("low", 0, "high", 1)))
                .containsEntry("servings", List.of(Map.of("name", "1 cup", "grams", 158)));
    }

    @Test
    void searchWordsAreTextNotPatterns() throws Exception {
        // A % or _ typed by the user matches itself, not everything (LIKE wildcards escaped).
        assertThat(list(post("/v1/foods/search", Map.of("q", "%%")))).isEmpty();
        assertThat(post("/v1/foods/search", Map.of("q", "c"))).as("one letter").hasStatus(400);
        assertThat(post("/v1/foods/search", Map.of("q", "chicken", "limit", 51))).hasStatus(400);
    }

    @Test
    void aBarcodeIsFoundWhateverLengthItIsScannedAt() throws Exception {
        // UPC-A 016000275287, EAN-13 0016000275287, GTIN-14 00016000275287: one product.
        for (String gtin : List.of("016000275287", "0016000275287", "00016000275287")) {
            assertThat(map(post("/v1/foods/barcode-lookup", Map.of("gtin", gtin)))).as(gtin).containsEntry("id", "fdc:1897574")
                    .containsEntry("brand", "Cheerios");
        }
    }

    @Test
    void aUpcEBarcodeIsExpandedToItsUpcA() throws Exception {
        // UPC-E 04963406 (a small US package) is UPC-A 049000006346; padded as it is, its check digit would not hold.
        food("fdc:999002", "Cola", "Small Can", "BRANDED", "42", "0", "10.6", "0", "00049000006346", null);

        assertThat(map(post("/v1/foods/barcode-lookup", Map.of("gtin", "04963406")))).containsEntry("id", "fdc:999002");
    }

    @Test
    void aBarcodeFdcDoesNotHaveIsNotFoundAndAMisreadOneIsRefused() throws Exception {
        assertThat(post("/v1/foods/barcode-lookup", Map.of("gtin", "8690504055501"))).as("a valid Turkish EAN, not in FDC").hasStatus(404);
        assertThat(post("/v1/foods/barcode-lookup", Map.of("gtin", "016000275288"))).as("check digit wrong").hasStatus(400);
        assertThat(post("/v1/foods/barcode-lookup", Map.of("gtin", "12ab"))).hasStatus(400);
    }

    @Test
    void anEstimateIsTheSumOfItsItemsRangesAndAsksAboutTheWidestUnweighedOne() throws Exception {
        MvcTestResult result = post("/v1/food-estimates", Map.of("items", List.of(
                item("fdc:171477", 200, "g", "WEIGHED"),
                item("fdc:1897574", 50, "g", "ESTIMATED"))));

        assertThat(result).hasStatusOk();
        Map<String, Object> estimate = map(result);
        assertThat(estimate).containsEntry("kcal", Map.of("low", 372, "high", 742)).containsEntry("proteinG", Map.of("low", 55, "high", 81));
        assertThat((List<Map<String, Object>>) estimate.get("items")).extracting(item -> item.get("kcal"))
                .containsExactly(Map.of("low", 282, "high", 382), Map.of("low", 90, "high", 360));
        assertThat(estimate).containsEntry("question", Map.of("foodId", "fdc:1897574", "copyKey", "foodEstimate.question.grams"));
    }

    @Test
    void aServingIsAMeasureAndMillilitresNeedTheFoodsDensity() throws Exception {
        Map<String, Object> cup = map(post("/v1/food-estimates", Map.of("items", List.of(item("fdc:168878", 1, "1 cup", null)))));
        assertThat(cup).containsEntry("kcal", Map.of("low", 138, "high", 283));

        // 250 ml whole milk × 1.03 g/ml = 257.5 g, eyeballed: 61 × 0.9 × 2.575 × 0.5 = 70.68 → 70
        Map<String, Object> milk = map(post("/v1/food-estimates", Map.of("items", List.of(item("fdc:746782", 250, "ml", null)))));
        assertThat((Map<String, Object>) milk.get("kcal")).containsEntry("low", 70);
        assertThat(post("/v1/food-estimates", Map.of("items", List.of(item("fdc:171477", 250, "ml", null))))).as("no density").hasStatus(400);
        assertThat(post("/v1/food-estimates", Map.of("items", List.of(item("fdc:171477", 1, "1 bucket", null))))).as("no such serving").hasStatus(400);
    }

    @Test
    void anEstimateOfWhatIsNotThereIsRefused() {
        assertThat(post("/v1/food-estimates", Map.of("items", List.of(item("fdc:0", 100, "g", null))))).as("unknown food").hasStatus(400);
        assertThat(post("/v1/food-estimates", Map.of("items", List.of(item("fdc:171477", 0, "g", null))))).as("nothing").hasStatus(400);
        assertThat(post("/v1/food-estimates", Map.of("items", List.of(item("fdc:171477", 100000, "g", null))))).as("100 kg").hasStatus(400);
        assertThat(post("/v1/food-estimates", Map.of("items", List.of()))).as("no items").hasStatus(400);
    }

    private Map<String, Object> item(String food, double quantity, String unit, String certainty) {
        Map<String, Object> amount = new HashMap<>(Map.of("quantity", quantity, "unit", unit));
        if (certainty != null) {
            amount.put("certainty", certainty);
        }
        return Map.of("foodId", food, "amount", amount);
    }

    private void food(String id, String name, String brand, String source, String kcal, String protein, String carbs, String fat, String gtin,
            String gramsPerMl) {
        jdbc.sql("""
                insert into nutrition.food (id, name, brand, source, kcal, protein_g, carbs_g, fat_g, gtin, grams_per_ml)
                values (:id, :name, :brand, :source, :kcal::numeric, :protein::numeric, :carbs::numeric, :fat::numeric, :gtin,
                        :density::numeric) on conflict (id) do nothing""")
                .param("id", id).param("name", name).param("brand", brand).param("source", source).param("kcal", kcal)
                .param("protein", protein).param("carbs", carbs).param("fat", fat).param("gtin", gtin).param("density", gramsPerMl).update();
    }

    private void serving(String food, int seq, String name, String grams) {
        jdbc.sql("insert into nutrition.food_serving (food_id, seq, name, grams) values (:food, :seq, :name, :grams::numeric) on conflict do nothing")
                .param("food", food).param("seq", seq).param("name", name).param("grams", grams).update();
    }

    private MvcTestResult post(String uri, Object body) {
        AccountId account = TestSessions.newAccount();
        return mvc.post().uri(uri).header("Authorization", TestSessions.bearer(context, account)).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(body)).exchange();
    }

    private static Map<String, Object> map(MvcTestResult result) throws Exception {
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }

    private static List<Map<String, Object>> list(MvcTestResult result) throws Exception {
        return JSON.readValue(result.getResponse().getContentAsString(), List.class);
    }
}
