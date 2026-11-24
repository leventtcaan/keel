package app.keel.nutrition;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Loads the Turkish dishes (K-1213) at startup, after the FoodData Central releases they are worked out from (FdcImportRunner
 * imports Foundation, SR Legacy and Survey first, in the same start): on whenever that import is. What came in and what could not
 * be worked out is in nutrition.food_import (dataset RECIPE), not in the log.
 */
@Component
@ConditionalOnProperty("keel.fdc.import-dir")
@Order(2)
class TurkishDishRunner implements ApplicationRunner {

    private final TurkishDishImporter importer;

    TurkishDishRunner(TurkishDishImporter importer) {
        this.importer = importer;
    }

    @Override
    public void run(ApplicationArguments args) {
        try (InputStream in = TurkishDishRunner.class.getResourceAsStream("/data/food/tr-dishes.json")) {
            String json = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            importer.load(TurkishDishes.read(json), TurkishDishes.version(json));
        } catch (IOException unreadable) {
            throw new UncheckedIOException(unreadable);
        }
    }
}
