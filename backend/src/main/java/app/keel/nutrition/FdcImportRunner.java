package app.keel.nutrition;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Stream;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Imports the FoodData Central releases unzipped under {@code keel.fdc.import-dir} at startup (K-226): each folder that
 * holds foundation_food.csv or sr_legacy_food.csv, its release read from FDC's folder name
 * (FoodData_Central_foundation_food_csv_2025-12-18 → 2025-12-18). Off unless the property is set; the files are not in
 * the repository.
 */
@Component
@ConditionalOnProperty("keel.fdc.import-dir")
class FdcImportRunner implements ApplicationRunner {

    private final FdcImporter importer;
    private final Path root;

    FdcImportRunner(FdcImporter importer, org.springframework.core.env.Environment environment) {
        this.importer = importer;
        this.root = Path.of(environment.getRequiredProperty("keel.fdc.import-dir"));
    }

    @Override
    public void run(ApplicationArguments args) {
        for (Path folder : releases(root)) {
            FdcImport.Dataset dataset = Files.exists(folder.resolve("foundation_food.csv")) ? FdcImport.Dataset.FOUNDATION : FdcImport.Dataset.SR_LEGACY;
            // What came in is recorded in nutrition.food_import (release, file hash, counts), not in the log (V3: SafeLog only).
            importer.load(folder, dataset, release(folder.getFileName().toString()));
        }
    }

    /**
     * The newest release of each dataset under the root (FDC's release names sort by date): an older one alongside would
     * bring back foods the new one dropped.
     */
    static List<Path> releases(Path root) {
        try (Stream<Path> walk = Files.walk(root, 3)) {
            Map<String, Path> newest = new TreeMap<>();
            walk.filter(Files::isDirectory).forEach(folder -> {
                String list = Files.exists(folder.resolve("foundation_food.csv")) ? "foundation_food.csv"
                        : Files.exists(folder.resolve("sr_legacy_food.csv")) ? "sr_legacy_food.csv" : null;
                if (list != null) {
                    newest.merge(list, folder, (a, b) -> release(a.getFileName().toString()).compareTo(release(b.getFileName().toString())) >= 0 ? a : b);
                }
            });
            return newest.values().stream().sorted().toList();
        } catch (IOException unreadable) {
            throw new UncheckedIOException(unreadable);
        }
    }

    /** FDC names its folders ..._csv_&lt;release&gt;: the part after the last "_csv_", or the whole name. */
    static String release(String folderName) {
        int at = folderName.lastIndexOf("_csv_");
        return at < 0 ? folderName : folderName.substring(at + "_csv_".length());
    }
}
