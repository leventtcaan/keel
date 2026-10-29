package app.keel.nutrition;

import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Loads the Open Food Facts Turkey file into nutrition.food (K-1042, ADR-088): one transaction, the file's products
 * upserted by {@code off:<code>} with their servings replaced and the dataset-OFF foods the file no longer has removed — so a
 * file gives exactly its products, again and again, and a product that stays keeps its id. Foods of another dataset are
 * never touched. Meals and recipes keep their own copy of a food's name and values and hold its id without a foreign key
 * (V10, V22), so removing a product breaks no entry. What came in is recorded in nutrition.food_import (V3: the log
 * carries no counts of our own).
 */
@Service
class OffImporter {

    enum Outcome {
        /** No file at the path. */
        ABSENT,
        /** The file is the one already imported. */
        UNCHANGED,
        /** Not one usable product in the file (an empty or foreign file): the foods in the table stay as they are. */
        NOTHING_USABLE,
        IMPORTED
    }

    private static final String DATASET = "OFF";

    private final NamedParameterJdbcTemplate jdbc;
    private final Clock clock;

    OffImporter(NamedParameterJdbcTemplate jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    /** Imports the file unless there is none or its hash is the one recorded last time; all or nothing. */
    @Transactional
    Outcome loadIfChanged(Path file) {
        if (!Files.isRegularFile(file)) {
            return Outcome.ABSENT;
        }
        String sha = sha256(file);
        Integer same = jdbc.queryForObject("select count(*) from nutrition.food_import where dataset = :dataset and sha256 = :sha",
                new MapSqlParameterSource("dataset", DATASET).addValue("sha", sha), Integer.class);
        if (same != null && same > 0) {
            return Outcome.UNCHANGED;
        }
        return load(file, sha);
    }

    private Outcome load(Path file, String sha) {
        // A barcode another dataset's food holds stays with it (the column is unique): the product is skipped and counted.
        Set<String> held = new HashSet<>(jdbc.getJdbcTemplate().queryForList("select gtin from nutrition.food where gtin is not null and dataset <> 'OFF'",
                String.class));
        OffImport.Read read = OffImport.read(file, held);
        if (read.foods().isEmpty()) {
            return Outcome.NOTHING_USABLE;
        }
        List<MapSqlParameterSource> foods = new ArrayList<>();
        List<MapSqlParameterSource> servings = new ArrayList<>();
        for (OffImport.Food food : read.foods()) {
            foods.add(new MapSqlParameterSource("id", food.id()).addValue("name", food.name()).addValue("brand", food.brand())
                    .addValue("gtin", food.gtin()).addValue("kcal", food.kcal()).addValue("protein", food.proteinG())
                    .addValue("carbs", food.carbsG()).addValue("fat", food.fatG()));
            if (food.serving() != null) {
                servings.add(new MapSqlParameterSource("food", food.id()).addValue("seq", 1).addValue("name", food.serving().name())
                        .addValue("grams", food.serving().grams()));
            }
        }
        String[] ids = read.foods().stream().map(OffImport.Food::id).toArray(String[]::new);
        // First the products the file no longer has (their servings go with them), so a barcode that moved to another code is free.
        jdbc.update("delete from nutrition.food where dataset = 'OFF' and not (id = any(:ids))", new MapSqlParameterSource("ids", ids));
        jdbc.batchUpdate("""
                insert into nutrition.food (id, name, brand, source, kcal, protein_g, carbs_g, fat_g, gtin, dataset)
                values (:id, :name, :brand, 'BRANDED', :kcal, :protein, :carbs, :fat, :gtin, 'OFF')
                on conflict (id) do update set name = excluded.name, brand = excluded.brand, kcal = excluded.kcal, protein_g = excluded.protein_g,
                carbs_g = excluded.carbs_g, fat_g = excluded.fat_g, gtin = excluded.gtin""", foods.toArray(MapSqlParameterSource[]::new));
        jdbc.batchUpdate("delete from nutrition.food_serving where food_id = :id",
                read.foods().stream().map(food -> new MapSqlParameterSource("id", food.id())).toArray(MapSqlParameterSource[]::new));
        jdbc.batchUpdate("insert into nutrition.food_serving (food_id, seq, name, grams) values (:food, :seq, :name, :grams)",
                servings.toArray(MapSqlParameterSource[]::new));
        // One record: the file in the table now (its date is the release).
        jdbc.update("delete from nutrition.food_import where dataset = 'OFF'", new MapSqlParameterSource());
        jdbc.update("""
                insert into nutrition.food_import (dataset, release, sha256, imported_at, foods, skipped)
                values ('OFF', :release, :sha, :at, :foods, :skipped)""",
                new MapSqlParameterSource("release", modified(file).toString()).addValue("sha", sha)
                        .addValue("at", clock.instant().atOffset(ZoneOffset.UTC)).addValue("foods", read.foods().size())
                        .addValue("skipped", read.skipped()));
        return Outcome.IMPORTED;
    }

    private static LocalDate modified(Path file) {
        try {
            return LocalDate.ofInstant(Files.getLastModifiedTime(file).toInstant(), ZoneOffset.UTC);
        } catch (IOException unreadable) {
            throw new UncheckedIOException(unreadable);
        }
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
