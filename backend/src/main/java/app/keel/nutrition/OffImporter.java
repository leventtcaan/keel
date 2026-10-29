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
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Loads an Open Food Facts region's file into nutrition.food (K-1042, K-1061, ADR-088): the file's products upserted by
 * their id with their servings replaced, and the foods of that region and dataset OFF the file no longer has removed — so a
 * file gives exactly its products, again and again, and a product that stays keeps its id. Each region has its own file, its
 * own rows (id, {@code region}) and its own release record, so importing the US file never removes a Turkey product and the
 * other way round; foods of another dataset are never touched. Meals and recipes keep their own copy of a food's name and
 * values and hold its id without a foreign key (V10, V22), so removing a product breaks no entry. What came in is recorded in
 * nutrition.food_import (V3: the log carries no counts of our own).
 *
 * <p>The file is read as a stream and written {@value #BATCH} products to a transaction, so a US file of hundreds of thousands
 * does not sit in memory or in one long transaction, and a backend restarted in the middle simply imports it again: the upserts
 * are the same rows, every product is stamped with the file's hash, and only at the end the products of another file are
 * removed and the release recorded. A barcode a USDA food already holds stays with it (the label of USDA is preferred): that
 * product is skipped and counted.
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

    private static final int BATCH = 2000;

    private final NamedParameterJdbcTemplate jdbc;
    private final Clock clock;
    private final TransactionTemplate transaction;

    OffImporter(NamedParameterJdbcTemplate jdbc, Clock clock, PlatformTransactionManager transactions) {
        this.jdbc = jdbc;
        this.clock = clock;
        this.transaction = new TransactionTemplate(transactions);
    }

    /** The name food_import keeps a region's file under: "OFF" for Turkey (since K-1042), "OFF_US" for the United States. */
    static String dataset(String region) {
        return OffImport.TURKEY.equals(region) ? "OFF" : "OFF_" + region;
    }

    /** Imports the Turkey file unless there is none or its hash is the one recorded last time. */
    Outcome loadIfChanged(Path file) {
        return loadIfChanged(file, OffImport.TURKEY);
    }

    /** Imports a region's file ("TR", "US") unless there is none or its hash is the one recorded last time. */
    Outcome loadIfChanged(Path file, String region) {
        if (!region.matches("[A-Z]{2}")) {
            throw new IllegalArgumentException("region is a two-letter country code");
        }
        if (!Files.isRegularFile(file)) {
            return Outcome.ABSENT;
        }
        String sha = sha256(file);
        Integer same = jdbc.queryForObject("select count(*) from nutrition.food_import where dataset = :dataset and sha256 = :sha",
                new MapSqlParameterSource("dataset", dataset(region)).addValue("sha", sha), Integer.class);
        if (same != null && same > 0) {
            return Outcome.UNCHANGED;
        }
        return load(file, region, sha);
    }

    private Outcome load(Path file, String region, String sha) {
        List<OffImport.Food> batch = new ArrayList<>(BATCH);
        int[] counts = new int[2];
        int skipped = OffImport.stream(file, region, food -> {
            batch.add(food);
            if (batch.size() == BATCH) {
                counts[0] += write(batch, region, sha, counts);
                batch.clear();
            }
        });
        counts[0] += write(batch, region, sha, counts);
        if (counts[0] == 0) {
            return Outcome.NOTHING_USABLE;
        }
        int heldSkipped = counts[1];
        transaction.executeWithoutResult(status -> {
            // The products this region's earlier file had and this one has not (their servings go with them), so a barcode that
            // moved to another code is free. Another region's products have another region and stay.
            jdbc.update("""
                    delete from nutrition.food where dataset = 'OFF' and region = :region and import_release is distinct from :sha""",
                    new MapSqlParameterSource("region", region).addValue("sha", sha));
            // One record per region: the file in the table now (its date is the release).
            jdbc.update("delete from nutrition.food_import where dataset = :dataset", new MapSqlParameterSource("dataset", dataset(region)));
            jdbc.update("""
                    insert into nutrition.food_import (dataset, release, sha256, imported_at, foods, skipped)
                    values (:dataset, :release, :sha, :at, :foods, :skipped)""",
                    new MapSqlParameterSource("dataset", dataset(region)).addValue("release", modified(file).toString()).addValue("sha", sha)
                            .addValue("at", clock.instant().atOffset(ZoneOffset.UTC)).addValue("foods", counts[0])
                            .addValue("skipped", skipped + heldSkipped));
        });
        return Outcome.IMPORTED;
    }

    /** Writes the batch but for the products whose barcode a USDA food holds; returns how many were written, counts the others in {@code counts[1]}. */
    private int write(List<OffImport.Food> batch, String region, String sha, int[] counts) {
        if (batch.isEmpty()) {
            return 0;
        }
        Set<String> held = new HashSet<>(jdbc.queryForList("""
                select gtin from nutrition.food where gtin = any (cast(:gtins as text[])) and dataset <> 'OFF'""",
                new MapSqlParameterSource("gtins", batch.stream().map(OffImport.Food::gtin).toArray(String[]::new)), String.class));
        List<OffImport.Food> foods = batch.stream().filter(food -> !held.contains(food.gtin())).toList();
        counts[1] += batch.size() - foods.size();
        List<MapSqlParameterSource> rows = new ArrayList<>();
        String[] ids = foods.stream().map(OffImport.Food::id).toArray(String[]::new);
        List<MapSqlParameterSource> servings = new ArrayList<>();
        for (OffImport.Food food : foods) {
            rows.add(new MapSqlParameterSource("id", food.id()).addValue("name", food.name()).addValue("brand", food.brand())
                    .addValue("gtin", food.gtin()).addValue("kcal", food.kcal()).addValue("protein", food.proteinG())
                    .addValue("carbs", food.carbsG()).addValue("fat", food.fatG()).addValue("region", region).addValue("sha", sha));
            if (food.serving() != null) {
                servings.add(new MapSqlParameterSource("food", food.id()).addValue("seq", 1).addValue("name", food.serving().name())
                        .addValue("grams", food.serving().grams()));
            }
        }
        transaction.executeWithoutResult(status -> {
            jdbc.batchUpdate("""
                    insert into nutrition.food (id, name, brand, source, kcal, protein_g, carbs_g, fat_g, gtin, dataset, region, import_release)
                    values (:id, :name, :brand, 'BRANDED', :kcal, :protein, :carbs, :fat, :gtin, 'OFF', :region, :sha)
                    on conflict (id) do update set name = excluded.name, brand = excluded.brand, kcal = excluded.kcal, protein_g = excluded.protein_g,
                    carbs_g = excluded.carbs_g, fat_g = excluded.fat_g, gtin = excluded.gtin, region = excluded.region,
                    import_release = excluded.import_release""", rows.toArray(MapSqlParameterSource[]::new));
            jdbc.update("delete from nutrition.food_serving where food_id = any (cast(:ids as text[]))", new MapSqlParameterSource("ids", ids));
            jdbc.batchUpdate("insert into nutrition.food_serving (food_id, seq, name, grams) values (:food, :seq, :name, :grams)",
                    servings.toArray(MapSqlParameterSource[]::new));
        });
        return foods.size();
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
