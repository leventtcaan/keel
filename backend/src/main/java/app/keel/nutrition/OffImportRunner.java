package app.keel.nutrition;

import java.nio.file.Path;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Imports the Open Food Facts Turkey file at {@code keel.off.import-file} at startup (K-1042, ADR-088), the way
 * {@link FdcImportRunner} does the FoodData Central folders: off unless the property is set, nothing happens when there is
 * no file there (deploy/fetch-off.sh has not run yet) or it is the one already imported. The file is not in the repository.
 * What came in is recorded in nutrition.food_import, not in the log (V3).
 */
@Component
@ConditionalOnProperty("keel.off.import-file")
class OffImportRunner implements ApplicationRunner {

    private final OffImporter importer;
    private final Path file;

    OffImportRunner(OffImporter importer, Environment environment) {
        this.importer = importer;
        this.file = Path.of(environment.getRequiredProperty("keel.off.import-file"));
    }

    @Override
    public void run(ApplicationArguments args) {
        importer.loadIfChanged(file);
    }
}
