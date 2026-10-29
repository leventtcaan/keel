package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * Open Food Facts by region (K-1061, ADR-088, ADR-090 #1): a file is one region's, a product carries the region it was kept
 * for, and the ids tell the regions apart so one region's import never touches another's rows. No database here.
 */
class OffImportRegionTests {

    private static final Path US = Path.of("src/test/resources/off/off-us.jsonl");

    private static List<OffImport.Food> read(Path file, String region, int[] skipped) {
        List<OffImport.Food> foods = new ArrayList<>();
        skipped[0] = OffImport.stream(file, region, foods::add);
        return foods;
    }

    @Test
    void theUsFileGivesUsProductsWithTheirOwnIds() {
        int[] skipped = new int[1];

        List<OffImport.Food> foods = read(US, "US", skipped);

        assertThat(foods).extracting(OffImport.Food::id)
                .containsExactly("off-us:0818290010004", "off-us:0049000028911", "off-us:0070847811169", "off-us:8690504012344");
        assertThat(foods.get(1).gtin()).isEqualTo("00049000028911");
        assertThat(foods.get(1).serving()).isEqualTo(new OffImport.Serving("1 serving (1 can (355 ml))", new java.math.BigDecimal("355.00")));
        // A Turkish line in the US file and a repeated code.
        assertThat(skipped[0]).isEqualTo(2);
    }

    @Test
    void turkeyKeepsTheIdsItHadSinceK1042() {
        assertThat(OffImport.id("TR", "8690504012344")).isEqualTo("off:8690504012344");
        assertThat(OffImport.id("US", "8690504012344")).isEqualTo("off-us:8690504012344");
        assertThat(OffImport.parse("{\"code\":\"96385074\",\"name\":\"x\",\"kcal\":1,\"protein\":1,\"carbs\":1,\"fat\":1}").orElseThrow().id())
                .isEqualTo("off:96385074");
    }

    @Test
    void aLineOfAnotherRegionIsNotThisRegionsProduct() {
        String us = "{\"code\":\"96385074\",\"name\":\"x\",\"kcal\":1,\"protein\":1,\"carbs\":1,\"fat\":1,\"region\":\"US\"}";

        assertThat(OffImport.parse(us, "US")).isPresent();
        assertThat(OffImport.parse(us, "TR")).as("the Turkey file would not take a US product in").isEmpty();
        assertThat(OffImport.parse(us.replace("\"region\":\"US\"", "\"region\":\"us\""), "US")).as("case does not matter").isPresent();
        assertThat(OffImport.parse(us.replace(",\"region\":\"US\"", ""), "US")).as("a line with no region is the file's").isPresent();
    }

    @Test
    void theSameBarcodeInTwoRegionsFilesIsOneProductInEach() {
        int[] skipped = new int[1];
        List<OffImport.Food> us = read(US, "US", skipped);

        // 8690504012344 is in the US sample and in the Turkey sample (off-tr.jsonl) under its own id each.
        assertThat(us).extracting(OffImport.Food::gtin).contains("08690504012344");
        assertThat(OffImport.read(Path.of("src/test/resources/off/off-tr.jsonl"), java.util.Set.of()).foods()).extracting(OffImport.Food::gtin)
                .contains("08690504012344");
    }

    @Test
    void aBigFileIsStreamedAndTheRepeatedBarcodesCounted(@TempDir Path dir) throws Exception {
        Path file = dir.resolve("off-us.jsonl");
        try (var out = Files.newBufferedWriter(file)) {
            for (int i = 0; i < 50_000; i++) {
                String code = String.format("%013d", 1_000_000_000_000L + (i % 40_000));
                out.write("{\"code\":\"" + code + "\",\"name\":\"Product " + i + "\",\"kcal\":10,\"protein\":1,\"carbs\":1,\"fat\":1,\"region\":\"US\"}\n");
            }
        }
        int[] count = new int[1];

        int skipped = OffImport.stream(file, "US", food -> count[0]++);

        assertThat(count[0]).isEqualTo(40_000);
        assertThat(skipped).isEqualTo(10_000);
    }

    @Test
    void regionFilesAreFoundByNameInTheirDirectory(@TempDir Path dir) throws Exception {
        Files.createFile(dir.resolve("off-us.jsonl"));
        Files.createFile(dir.resolve("off-tr.jsonl"));
        Files.createFile(dir.resolve("off-us.jsonl.part"));
        Files.createFile(dir.resolve("off-usa.jsonl"));
        Files.createFile(dir.resolve("notes.txt"));

        assertThat(OffImportRunner.files(dir)).extracting(file -> file.getFileName().toString()).containsExactly("off-tr.jsonl", "off-us.jsonl");
        assertThat(OffImportRunner.region("off-us.jsonl")).contains("US");
        assertThat(OffImportRunner.region("off-us.jsonl.part")).isEmpty();
        assertThat(OffImportRunner.files(dir.resolve("not-there"))).isEmpty();
    }

    @Test
    void aReleaseIsRecordedUnderTheRegionsName() {
        assertThat(OffImporter.dataset("TR")).as("Turkey's record keeps its name from K-1042").isEqualTo("OFF");
        assertThat(OffImporter.dataset("US")).isEqualTo("OFF_US");
    }
}
