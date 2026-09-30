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
import org.springframework.transaction.annotation.Transactional;

/**
 * Loads a FoodData Central release into nutrition.food (K-226): one transaction per dataset, each food upserted by its
 * FDC id and its servings replaced, so importing the same release again gives the same rows. Values are stored to the
 * columns' two decimals here, not rounded silently by the database.
 */
@Service
class FdcImporter {

    record Imported(FdcImport.Dataset dataset, String release, int foods, int skipped) {
    }

    private static final int DECIMALS = 2;

    private final NamedParameterJdbcTemplate jdbc;
    private final Clock clock;

    FdcImporter(NamedParameterJdbcTemplate jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
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
        jdbc.batchUpdate("delete from nutrition.food_serving where food_id = :id",
                read.foods().stream().map(food -> new MapSqlParameterSource("id", food.id())).toArray(MapSqlParameterSource[]::new));
        jdbc.batchUpdate("insert into nutrition.food_serving (food_id, seq, name, grams) values (:food, :seq, :name, :grams)",
                servings.toArray(MapSqlParameterSource[]::new));
        jdbc.update("""
                insert into nutrition.food_import (dataset, release, sha256, imported_at, foods, skipped)
                values (:dataset, :release, :sha, :at, :foods, :skipped)
                on conflict (dataset, release) do update set sha256 = excluded.sha256, imported_at = excluded.imported_at, foods = excluded.foods,
                skipped = excluded.skipped""",
                new MapSqlParameterSource(Map.of("dataset", dataset.name(), "release", release, "sha", sha256(folder.resolve("food.csv")),
                        "at", clock.instant().atOffset(ZoneOffset.UTC), "foods", read.foods().size(), "skipped", read.skipped())));
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
