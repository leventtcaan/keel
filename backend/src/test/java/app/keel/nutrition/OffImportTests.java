package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * Reading the Open Food Facts Turkey subset (K-1042, ADR-088): one JSON line per product as deploy/off_filter.py writes
 * it. A line that is not a usable product is skipped and counted, a value missing is never guessed. No database here.
 */
class OffImportTests {

    private static final Path SAMPLE = Path.of("src/test/resources/off/off-tr.jsonl");

    @Test
    void aProductLineBecomesAFoodWithItsBarcodeAsGtin14() {
        OffImport.Food gofret = OffImport.parse("""
                {"code":"8690504012345","name":"Çikolatalı Gofret","name_en":"Chocolate wafer","brand":"Ülker","kcal":520.0,"protein":6.5,"carbs":60.25,"fat":28.0,"serving_g":30.0,"serving":"1 gofret (30 g)"}""")
                .orElseThrow();

        assertThat(gofret.id()).isEqualTo("off:8690504012345");
        assertThat(gofret.name()).isEqualTo("Çikolatalı Gofret");
        assertThat(gofret.brand()).isEqualTo("Ülker");
        assertThat(gofret.gtin()).isEqualTo("08690504012345");
        assertThat(gofret.kcal()).isEqualByComparingTo("520");
        assertThat(gofret.proteinG()).isEqualByComparingTo("6.5");
        assertThat(gofret.carbsG()).isEqualByComparingTo("60.25");
        assertThat(gofret.fatG()).isEqualByComparingTo("28");
    }

    @Test
    void aShortCodeIsPaddedToFourteenDigitsAndAFourteenDigitOneIsKept() {
        assertThat(parse("96385074", "x").gtin()).isEqualTo("00000096385074");
        assertThat(parse("8690632000011", "x").gtin()).isEqualTo("08690632000011");
        assertThat(parse("18690632000018", "x").gtin()).isEqualTo("18690632000018");
        assertThat(parse("18690632000018", "x").id()).isEqualTo("off:18690632000018");
    }

    @Test
    void theServingNamesTheFilterGivenTextOrFallsBackToTheGrams() {
        OffImport.Food withText = OffImport.parse("""
                {"code":"8690504012345","name":"A","brand":null,"kcal":1,"protein":1,"carbs":1,"fat":1,"serving_g":30.0,"serving":"2 biscuits (30 g)"}""")
                .orElseThrow();
        OffImport.Food gramsOnly = OffImport.parse("""
                {"code":"8690504012345","name":"A","brand":null,"kcal":1,"protein":1,"carbs":1,"fat":1,"serving_g":27.5,"serving":null}""")
                .orElseThrow();
        OffImport.Food wholeGrams = OffImport.parse("""
                {"code":"8690504012345","name":"A","brand":null,"kcal":1,"protein":1,"carbs":1,"fat":1,"serving_g":250,"serving":"  "}""")
                .orElseThrow();

        assertThat(withText.serving()).isEqualTo(new OffImport.Serving("1 serving (2 biscuits (30 g))", new BigDecimal("30.00")));
        assertThat(gramsOnly.serving()).isEqualTo(new OffImport.Serving("1 serving (27.5 g)", new BigDecimal("27.50")));
        assertThat(wholeGrams.serving()).isEqualTo(new OffImport.Serving("1 serving (250 g)", new BigDecimal("250.00")));
    }

    @Test
    void noServingWithoutAPositiveGramWeightEvenWhenTheTextIsThere() {
        for (String grams : new String[] {"null", "0", "-5", "0.001"}) {
            OffImport.Food food = OffImport.parse("""
                    {"code":"8690504012345","name":"A","brand":null,"kcal":1,"protein":1,"carbs":1,"fat":1,"serving_g":%s,"serving":"1 piece"}"""
                    .formatted(grams)).orElseThrow();

            assertThat(food.serving()).as("serving_g " + grams).isNull();
        }
    }

    @Test
    void brandAndNameAreTrimmedAndABlankBrandIsNoBrand() {
        OffImport.Food food = OffImport.parse("""
                {"code":"8690504012345","name":"  Süt  ","brand":"   ","kcal":1,"protein":1,"carbs":1,"fat":1}""").orElseThrow();

        assertThat(food.name()).isEqualTo("Süt");
        assertThat(food.brand()).isNull();
    }

    @Test
    void valuesAreKeptToTheColumnsTwoDecimals() {
        OffImport.Food food = OffImport.parse("""
                {"code":"8690504012345","name":"A","brand":null,"kcal":123.456,"protein":0.005,"carbs":1e-05,"fat":2.5}""").orElseThrow();

        assertThat(food.kcal()).isEqualTo(new BigDecimal("123.46"));
        assertThat(food.proteinG()).isEqualTo(new BigDecimal("0.01"));
        assertThat(food.carbsG()).isEqualTo(new BigDecimal("0.00"));
        assertThat(food.fatG()).isEqualTo(new BigDecimal("2.50"));
    }

    @Test
    void aLineThatIsNotAUsableProductIsNothing() {
        String[] unusable = {
            "not json at all",
            "[1, 2]",
            "{}",
            // the code: digits only, 8 to 14
            """
            {"code":"1234567","name":"A","kcal":1,"protein":1,"carbs":1,"fat":1}""",
            """
            {"code":"123456789012345","name":"A","kcal":1,"protein":1,"carbs":1,"fat":1}""",
            """
            {"code":"86905040123x5","name":"A","kcal":1,"protein":1,"carbs":1,"fat":1}""",
            """
            {"code":"٨٦٩٠٥٠٤٠١٢٣٤٥","name":"A","kcal":1,"protein":1,"carbs":1,"fat":1}""",
            """
            {"code":8690504012345,"name":"A","kcal":1,"protein":1,"carbs":1,"fat":1}""",
            // the name
            """
            {"code":"8690504012345","name":"  ","kcal":1,"protein":1,"carbs":1,"fat":1}""",
            """
            {"code":"8690504012345","kcal":1,"protein":1,"carbs":1,"fat":1}""",
            // each of the four nutrients: missing, null, a string, negative
            """
            {"code":"8690504012345","name":"A","protein":1,"carbs":1,"fat":1}""",
            """
            {"code":"8690504012345","name":"A","kcal":1,"protein":null,"carbs":1,"fat":1}""",
            """
            {"code":"8690504012345","name":"A","kcal":1,"protein":1,"carbs":"3","fat":1}""",
            """
            {"code":"8690504012345","name":"A","kcal":1,"protein":1,"carbs":1,"fat":-0.5}""",
            // more than the columns hold
            """
            {"code":"8690504012345","name":"A","kcal":100000,"protein":1,"carbs":1,"fat":1}""",
            """
            {"code":"8690504012345","name":"A","kcal":1,"protein":10000,"carbs":1,"fat":1}"""
        };

        for (String line : unusable) {
            assertThat(OffImport.parse(line)).as(line).isEmpty();
        }
    }

    @Test
    void aFileIsReadLineByLineWithTheDuplicateAndTheUnusableSkippedAndCounted() {
        OffImport.Read read = OffImport.read(SAMPLE, Set.of());

        assertThat(read.foods()).extracting(OffImport.Food::id).containsExactly("off:8690504012345", "off:8690632000011", "off:96385074");
        assertThat(read.foods().getFirst().name()).as("the first line of a code wins").isEqualTo("Çikolatalı Gofret");
        assertThat(read.skipped()).as("a repeated code and a line without energy").isEqualTo(2);
    }

    @Test
    void aBarcodeAnotherFoodAlreadyHoldsIsSkippedAndCounted() {
        OffImport.Read read = OffImport.read(SAMPLE, Set.of("08690632000011"));

        assertThat(read.foods()).extracting(OffImport.Food::id).containsExactly("off:8690504012345", "off:96385074");
        assertThat(read.skipped()).isEqualTo(3);
    }

    @Test
    void twoCodesThatPadToTheSameGtinGiveOneFood(@TempDir Path dir) throws Exception {
        Path file = dir.resolve("off.jsonl");
        Files.writeString(file, """
                {"code":"8690504012345","name":"First","kcal":1,"protein":1,"carbs":1,"fat":1}

                {"code":"08690504012345","name":"Same barcode, one more zero","kcal":2,"protein":2,"carbs":2,"fat":2}
                """);

        OffImport.Read read = OffImport.read(file, Set.of());

        assertThat(read.foods()).extracting(OffImport.Food::name).containsExactly("First");
        assertThat(read.skipped()).as("the empty line is no product and not counted; the second code is a repeat of the barcode").isEqualTo(1);
    }

    private static OffImport.Food parse(String code, String name) {
        return OffImport.parse("""
                {"code":"%s","name":"%s","brand":null,"kcal":1,"protein":1,"carbs":1,"fat":1}""".formatted(code, name)).orElseThrow();
    }
}
