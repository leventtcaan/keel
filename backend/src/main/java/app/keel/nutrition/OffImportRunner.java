package app.keel.nutrition;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Imports the Open Food Facts files in {@code keel.off.import-dir} at startup (K-1042, K-1061, ADR-088): one file a region,
 * {@code off-<region>.jsonl} ({@code off-tr.jsonl}, {@code off-us.jsonl}), each queued on the import thread behind the USDA
 * releases (FoodImportQueue) and imported when it changed. Off unless the property is set; a region with no file there
 * (deploy/fetch-off.sh has not run) is nothing; the files are not in the repository. What came in is recorded in
 * nutrition.food_import, not in the log (V3).
 */
@Component
@ConditionalOnProperty("keel.off.import-dir")
@Order(2)
class OffImportRunner implements ApplicationRunner {

    private static final Pattern FILE = Pattern.compile("off-([a-z]{2})\\.jsonl");

    private final OffImporter importer;
    private final FoodImportQueue queue;
    private final Path directory;

    OffImportRunner(OffImporter importer, FoodImportQueue queue, Environment environment) {
        this.importer = importer;
        this.queue = queue;
        this.directory = Path.of(environment.getRequiredProperty("keel.off.import-dir"));
    }

    @Override
    public void run(ApplicationArguments args) {
        for (Path file : files(directory)) {
            String region = region(file.getFileName().toString()).orElseThrow();
            queue.submit(() -> importer.loadIfChanged(file, region));
        }
    }

    /** The region files of the directory, by name; none when the directory is not there yet. */
    static List<Path> files(Path directory) {
        if (!Files.isDirectory(directory)) {
            return List.of();
        }
        try (Stream<Path> listed = Files.list(directory)) {
            return listed.filter(file -> region(file.getFileName().toString()).isPresent()).sorted().toList();
        } catch (IOException unreadable) {
            throw new UncheckedIOException(unreadable);
        }
    }

    /** "off-us.jsonl" → "US"; empty for any other name (the ".part" file the fetch writes aside is not one). */
    static Optional<String> region(String fileName) {
        Matcher match = FILE.matcher(fileName);
        return match.matches() ? Optional.of(match.group(1).toUpperCase(java.util.Locale.ROOT)) : Optional.empty();
    }
}
