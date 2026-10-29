package app.keel.nutrition;

import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Loads a FoodData Central release into nutrition.food (K-226, K-1061): each food upserted by its FDC id and its servings
 * replaced, the dataset's foods the release no longer has removed — so importing a release gives exactly its rows, again and
 * again. Foundation, SR Legacy and Survey (FNDDS) are a few thousand foods: one transaction. Branded is 430,000 products with
 * their barcodes, read as a stream and written in batches of {@value #BATCH}, each its own transaction, so the import can be
 * stopped (a deploy restarts the backend) and run again: the upserts change nothing for a food already there, every food of the
 * release is stamped with the release, and only at the end are the foods of another release removed — a stopped import leaves
 * the old release whole beside the part of the new one that came in, and food_import only records a finished one. Values are
 * stored to the columns' two decimals here, not rounded silently by the database.
 */
@Service
class FdcImporter {

    record Imported(FdcImport.Dataset dataset, String release, int foods, int skipped) {
    }

    private static final int DECIMALS = 2;
    private static final int BATCH = 2000;

    private final NamedParameterJdbcTemplate jdbc;
    private final Clock clock;
    private final TransactionTemplate transaction;

    FdcImporter(NamedParameterJdbcTemplate jdbc, Clock clock, PlatformTransactionManager transactions) {
        this.jdbc = jdbc;
        this.clock = clock;
        this.transaction = new TransactionTemplate(transactions);
    }

    /** Whether this release of the dataset has been imported to the end (food_import has it). */
    boolean imported(FdcImport.Dataset dataset, String release) {
        Integer found = jdbc.queryForObject("select count(*) from nutrition.food_import where dataset = :dataset and release = :release",
                new MapSqlParameterSource("dataset", dataset.name()).addValue("release", release), Integer.class);
        return found != null && found > 0;
    }

    /**
     * Loads a Branded Foods release: the products as a stream, {@value #BATCH} to a transaction (see the class note). A release
     * with no usable product changes nothing.
     */
    Imported loadBranded(Path folder, String release) {
        List<FdcBranded.Food> batch = new ArrayList<>(BATCH);
        FdcBranded.Result result = FdcBranded.stream(folder, food -> {
            batch.add(food);
            if (batch.size() == BATCH) {
                writeBranded(batch, release);
                batch.clear();
            }
        });
        writeBranded(batch, release);
        if (result.foods() == 0) {
            return new Imported(FdcImport.Dataset.BRANDED, release, 0, result.skipped());
        }
        transaction.executeWithoutResult(status -> {
            // A product another release had and this one does not (its servings go with it, by the key).
            jdbc.update("delete from nutrition.food where source = 'BRANDED' and dataset = 'FDC' and import_release is distinct from :release",
                    new MapSqlParameterSource("release", release));
            record(FdcImport.Dataset.BRANDED, release, sha256(folder.resolve("food.csv")), result.foods(), result.skipped());
        });
        return new Imported(FdcImport.Dataset.BRANDED, release, result.foods(), result.skipped());
    }

    private void writeBranded(List<FdcBranded.Food> foods, String release) {
        if (foods.isEmpty()) {
            return;
        }
        List<MapSqlParameterSource> rows = new ArrayList<>();
        List<MapSqlParameterSource> servings = new ArrayList<>();
        List<MapSqlParameterSource> ids = new ArrayList<>();
        for (FdcBranded.Food food : foods) {
            rows.add(new MapSqlParameterSource("id", food.id()).addValue("name", food.name()).addValue("brand", food.brand())
                    .addValue("gtin", food.gtin()).addValue("kcal", two(food.kcal())).addValue("protein", two(food.proteinG()))
                    .addValue("carbs", two(food.carbsG())).addValue("fat", two(food.fatG())).addValue("gml", food.gramsPerMl())
                    .addValue("release", release));
            ids.add(new MapSqlParameterSource("id", food.id()));
            if (food.serving() != null) {
                servings.add(new MapSqlParameterSource("food", food.id()).addValue("seq", 1).addValue("name", food.serving().name())
                        .addValue("grams", two(food.serving().grams())));
            }
        }
        transaction.executeWithoutResult(status -> {
            jdbc.batchUpdate("""
                    insert into nutrition.food (id, name, brand, source, kcal, protein_g, carbs_g, fat_g, gtin, grams_per_ml, dataset, region, import_release)
                    values (:id, :name, :brand, 'BRANDED', :kcal, :protein, :carbs, :fat, :gtin, :gml, 'FDC', 'US', :release)
                    on conflict (id) do update set name = excluded.name, brand = excluded.brand, source = excluded.source, kcal = excluded.kcal,
                    protein_g = excluded.protein_g, carbs_g = excluded.carbs_g, fat_g = excluded.fat_g, gtin = excluded.gtin,
                    grams_per_ml = excluded.grams_per_ml, import_release = excluded.import_release""", rows.toArray(MapSqlParameterSource[]::new));
            jdbc.batchUpdate("delete from nutrition.food_serving where food_id = :id", ids.toArray(MapSqlParameterSource[]::new));
            jdbc.batchUpdate("insert into nutrition.food_serving (food_id, seq, name, grams) values (:food, :seq, :name, :grams)",
                    servings.toArray(MapSqlParameterSource[]::new));
        });
    }

    private void record(FdcImport.Dataset dataset, String release, String sha, int foods, int skipped) {
        jdbc.update("""
                insert into nutrition.food_import (dataset, release, sha256, imported_at, foods, skipped)
                values (:dataset, :release, :sha, :at, :foods, :skipped)
                on conflict (dataset, release) do update set sha256 = excluded.sha256, imported_at = excluded.imported_at, foods = excluded.foods,
                skipped = excluded.skipped""",
                new MapSqlParameterSource(Map.of("dataset", dataset.name(), "release", release, "sha", sha,
                        "at", clock.instant().atOffset(ZoneOffset.UTC), "foods", foods, "skipped", skipped)));
    }

    @Transactional
    Imported load(Path folder, FdcImport.Dataset dataset, String release) {
        FdcImport.Read read = FdcImport.read(folder, dataset);
        List<MapSqlParameterSource> foods = new ArrayList<>();
        List<MapSqlParameterSource> servings = new ArrayList<>();
        for (FdcImport.Food food : read.foods()) {
            foods.add(new MapSqlParameterSource(Map.of("id", food.id(), "name", food.name(), "source", dataset.name(), "kcal", two(food.kcal()),
                    "protein", two(food.proteinG()), "carbs", two(food.carbsG()), "fat", two(food.fatG())))
                    .addValue("gml", food.gramsPerMl()));
            for (int seq = 0; seq < food.servings().size(); seq++) {
                FdcImport.Serving serving = food.servings().get(seq);
                servings.add(new MapSqlParameterSource(Map.of("food", food.id(), "seq", seq + 1, "name", serving.name(), "grams", two(serving.grams()))));
            }
        }
        jdbc.batchUpdate("""
                insert into nutrition.food (id, name, source, kcal, protein_g, carbs_g, fat_g, grams_per_ml)
                values (:id, :name, :source, :kcal, :protein, :carbs, :fat, :gml)
                on conflict (id) do update set name = excluded.name, source = excluded.source, kcal = excluded.kcal, protein_g = excluded.protein_g,
                carbs_g = excluded.carbs_g, fat_g = excluded.fat_g, grams_per_ml = excluded.grams_per_ml""", foods.toArray(MapSqlParameterSource[]::new));
        // A food this release no longer has (FDC gives an updated food a new id) goes; its servings go with it.
        jdbc.update("delete from nutrition.food where source = :source and id like 'fdc:%' and not (id = any(:ids))",
                new MapSqlParameterSource("source", dataset.name()).addValue("ids", read.foods().stream().map(FdcImport.Food::id).toArray(String[]::new)));
        jdbc.batchUpdate("delete from nutrition.food_serving where food_id = :id",
                read.foods().stream().map(food -> new MapSqlParameterSource("id", food.id())).toArray(MapSqlParameterSource[]::new));
        jdbc.batchUpdate("insert into nutrition.food_serving (food_id, seq, name, grams) values (:food, :seq, :name, :grams)",
                servings.toArray(MapSqlParameterSource[]::new));
        record(dataset, release, sha256(folder.resolve("food.csv")), read.foods().size(), read.skipped());
        return new Imported(dataset, release, read.foods().size(), read.skipped());
    }

    private static BigDecimal two(BigDecimal value) {
        return value.setScale(DECIMALS, RoundingMode.HALF_UP);
    }

    private static String sha256(Path file) {
        try (DigestInputStream in = new DigestInputStream(Files.newInputStream(file), MessageDigest.getInstance("SHA-256"))) {
            in.transferTo(OutputStream.nullOutputStream());
            return HexFormat.of().formatHex(in.getMessageDigest().digest());
        } catch (IOException unreadable) {
            throw new UncheckedIOException(unreadable);
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException(impossible);
        }
    }
}
