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
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Imports the FoodData Central releases unzipped under {@code keel.fdc.import-dir} at startup (K-226, K-1061): each folder
 * that holds foundation_food.csv, sr_legacy_food.csv, survey_fndds_food.csv or branded_food.csv, its release read from FDC's
 * folder name (FoodData_Central_foundation_food_csv_2025-12-18 → 2025-12-18). The three small datasets are imported here, as
 * before; Branded (430,000 products) is queued behind them on the import thread (FoodImportQueue) and skipped when that
 * release was imported to the end. Off unless the property is set; the files are not in the repository.
 */
@Component
@ConditionalOnProperty("keel.fdc.import-dir")
@Order(1)
class FdcImportRunner implements ApplicationRunner {

    private final FdcImporter importer;
    private final FoodImportQueue queue;
    private final Path root;

    FdcImportRunner(FdcImporter importer, FoodImportQueue queue, org.springframework.core.env.Environment environment) {
        this.importer = importer;
        this.queue = queue;
        this.root = Path.of(environment.getRequiredProperty("keel.fdc.import-dir"));
    }

    @Override
    public void run(ApplicationArguments args) {
        for (Path folder : releases(root)) {
            FdcImport.Dataset dataset = dataset(folder);
            String release = release(folder.getFileName().toString());
            if (dataset == FdcImport.Dataset.BRANDED) {
                // What came in is recorded in nutrition.food_import (release, file hash, counts), not in the log (V3: SafeLog only).
                queue.submit(() -> {
                    if (!importer.imported(dataset, release)) {
                        importer.loadBranded(folder, release);
                    }
                });
            } else {
                importer.load(folder, dataset, release);
            }
        }
    }

    /** The dataset a release folder holds, by its food list file. */
    static FdcImport.Dataset dataset(Path folder) {
        for (FdcImport.Dataset dataset : FdcImport.Dataset.values()) {
            if (Files.exists(folder.resolve(dataset.listFile()))) {
                return dataset;
            }
        }
        throw new IllegalArgumentException("not an FDC release folder: " + folder.getFileName());
    }

    /**
     * The newest release of each dataset under the root (FDC's release names sort by date): an older one alongside would bring
     * back foods the new one dropped. A folder with none of the food lists (the fetch script leaves only a marker where it pruned
     * an imported Branded release) is not a release.
     */
    static List<Path> releases(Path root) {
        try (Stream<Path> walk = Files.walk(root, 3)) {
            Map<String, Path> newest = new TreeMap<>();
            walk.filter(Files::isDirectory).forEach(folder -> {
                for (FdcImport.Dataset dataset : FdcImport.Dataset.values()) {
                    if (Files.exists(folder.resolve(dataset.listFile()))) {
                        newest.merge(dataset.listFile(), folder,
                                (a, b) -> release(a.getFileName().toString()).compareTo(release(b.getFileName().toString())) >= 0 ? a : b);
                        break;
                    }
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
