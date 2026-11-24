package app.keel.nutrition;

import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Writes the Turkish dishes (K-1213, {@link TurkishDishes}) into nutrition.food: each worked out from its ingredients' rows —
 * the USDA foods (Foundation first, then SR Legacy, then Survey) whose name is the ingredient's description — upserted by its id
 * "tr:..." with its one serving ("1 bowl (250 g)") replaced, and a dish the file no longer has removed, so loading gives exactly
 * the file's dishes again and again. A dish with an ingredient the database lacks is left out and counted, never worked out from
 * the rest. The run is recorded in nutrition.food_import (dataset RECIPE, release = the file's version).
 */
@Service
class TurkishDishImporter {

    record Imported(int dishes, int skipped) {
    }

    private static final int DECIMALS = 2;

    private final NamedParameterJdbcTemplate jdbc;
    private final Clock clock;

    TurkishDishImporter(NamedParameterJdbcTemplate jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    @Transactional
    Imported load(List<TurkishDishes.Dish> dishes, String release) {
        List<String> written = new ArrayList<>();
        for (TurkishDishes.Dish dish : dishes) {
            Optional<FoodRanges.Per100g> value = TurkishDishes.per100g(dish, this::ingredient);
            if (value.isEmpty()) {
                continue;
            }
            FoodRanges.Per100g per100g = value.get();
            jdbc.update("""
                    insert into nutrition.food (id, name, aliases, source, kcal, protein_g, carbs_g, fat_g, dataset, region)
                    values (:id, :name, :aliases, 'RECIPE', :kcal, :protein, :carbs, :fat, 'RECIPE', 'TR')
                    on conflict (id) do update set name = excluded.name, aliases = excluded.aliases, source = excluded.source, kcal = excluded.kcal,
                    protein_g = excluded.protein_g, carbs_g = excluded.carbs_g, fat_g = excluded.fat_g, dataset = excluded.dataset, region = excluded.region""",
                    new MapSqlParameterSource("id", dish.id()).addValue("name", dish.name()).addValue("aliases", String.join(" ", dish.aliases()))
                            .addValue("kcal", per100g.kcal()).addValue("protein", per100g.proteinG()).addValue("carbs", per100g.carbsG())
                            .addValue("fat", per100g.fatG()));
            jdbc.update("delete from nutrition.food_serving where food_id = :id", Map.of("id", dish.id()));
            jdbc.update("insert into nutrition.food_serving (food_id, seq, name, grams) values (:id, 1, :name, :grams)", new MapSqlParameterSource("id", dish.id())
                    .addValue("name", dish.serving() + " (" + dish.servingG().stripTrailingZeros().toPlainString() + " g)")
                    .addValue("grams", dish.servingG().setScale(DECIMALS, RoundingMode.HALF_UP)));
            written.add(dish.id());
        }
        // A dish this file no longer has (or no longer can work out) goes; its serving goes with it.
        jdbc.update("delete from nutrition.food where dataset = 'RECIPE' and id like 'tr:%' and not (id = any (cast(:ids as text[])))",
                Map.of("ids", written.toArray(String[]::new)));
        jdbc.update("""
                insert into nutrition.food_import (dataset, release, sha256, imported_at, foods, skipped)
                values ('RECIPE', :release, :sha, :at, :foods, :skipped)
                on conflict (dataset, release) do update set sha256 = excluded.sha256, imported_at = excluded.imported_at, foods = excluded.foods,
                skipped = excluded.skipped""",
                new MapSqlParameterSource(Map.of("release", release, "sha", sha256(dishes.toString()), "at", clock.instant().atOffset(ZoneOffset.UTC),
                        "foods", written.size(), "skipped", dishes.size() - written.size())));
        return new Imported(written.size(), dishes.size() - written.size());
    }

    /** The ingredient's values: the USDA food of that description, the laboratory-analysed sources before the survey's mixed dishes. */
    private Optional<FoodRanges.Per100g> ingredient(String description) {
        return jdbc.query("""
                select kcal, protein_g, carbs_g, fat_g from nutrition.food
                where name = :name and dataset = 'FDC' and source in ('FOUNDATION', 'SR_LEGACY', 'FNDDS')
                order by case source when 'FOUNDATION' then 0 when 'SR_LEGACY' then 1 else 2 end, id limit 1""", Map.of("name", description),
                (row, n) -> new FoodRanges.Per100g(row.getBigDecimal("kcal"), row.getBigDecimal("protein_g"), row.getBigDecimal("carbs_g"),
                        row.getBigDecimal("fat_g"))).stream().findFirst();
    }

    private static String sha256(String text) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException(impossible);
        }
    }
}
