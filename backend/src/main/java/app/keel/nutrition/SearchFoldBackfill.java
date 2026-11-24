package app.keel.nutrition;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Fills nutrition.food.search_folded (V62) for the rows that were there before it existed (K-1213): after the application has
 * started, on the import thread, {@code batch-size} rows by id at a time — each batch its own short transaction, so no lock is held
 * and the server answers all the while — and {@code pause} between batches. A row is filled by the table's own trigger (setting its
 * name to itself fires it), so the fold is written once, in the database. Idempotent and resumable: a row already filled is left,
 * a restart begins again from the first id and passes the filled ones. Progress is a row in nutrition.food_import (dataset
 * SEARCH_FOLDED, release progress, foods = rows filled so far: counts only, never a value); when the last row is filled the release
 * done is written, and from then on the search reads the folded text (until then it reads search_text).
 */
@Service
class SearchFoldBackfill {

    /** {@code batchSize} rows per batch; {@code pauseMillis} between batches; {@code enabled} off only for tests. */
    @ConfigurationProperties("keel.nutrition.search.fold-backfill")
    record Settings(int batchSize, long pauseMillis, boolean enabled) {
    }

    private static final String DATASET = "SEARCH_FOLDED";
    private final NamedParameterJdbcTemplate jdbc;
    private final Clock clock;
    private final Settings settings;
    // Once true it stays true: a row written later gets its folded text from the trigger.
    private final AtomicBoolean ready = new AtomicBoolean();

    SearchFoldBackfill(NamedParameterJdbcTemplate jdbc, Clock clock, Settings settings) {
        this.jdbc = jdbc;
        this.clock = clock;
        this.settings = settings;
    }

    boolean enabled() {
        return settings.enabled();
    }

    /** Whether every row has its folded text (the done record is there). */
    boolean ready() {
        if (ready.get()) {
            return true;
        }
        Integer done = jdbc.queryForObject("select count(*) from nutrition.food_import where dataset = :dataset and release = 'done'",
                new MapSqlParameterSource("dataset", DATASET), Integer.class);
        if (done != null && done > 0) {
            ready.set(true);
        }
        return ready.get();
    }

    /** Runs to the end with the configured batch size and pause; returns the rows filled by this run. */
    int run() {
        return run(settings.batchSize(), settings.pauseMillis());
    }

    int run(int batchSize) {
        return run(batchSize, 0);
    }

    private int run(int batchSize, long pauseMillis) {
        int filled = 0;
        String last = "";
        while (true) {
            List<String> ids = jdbc.queryForList("select id from nutrition.food where id > :last order by id limit :n",
                    new MapSqlParameterSource("last", last).addValue("n", batchSize), String.class);
            if (ids.isEmpty()) {
                break;
            }
            last = ids.getLast();
            filled += jdbc.update("update nutrition.food set name = name where id = any (cast(:ids as text[])) and search_folded is null",
                    new MapSqlParameterSource("ids", ids.toArray(String[]::new)));
            record("progress", filled);
            if (pauseMillis > 0) {
                try {
                    Thread.sleep(pauseMillis);
                } catch (InterruptedException stopped) {
                    Thread.currentThread().interrupt();
                    return filled;
                }
            }
        }
        // A row written meanwhile has its own (trigger): done only when none is left.
        Integer left = jdbc.queryForObject("select count(*) from (select 1 from nutrition.food where search_folded is null limit 1) one",
                new MapSqlParameterSource(), Integer.class);
        if (left != null && left == 0) {
            record("done", filled);
            ready.set(true);
        }
        return filled;
    }

    private void record(String release, int rows) {
        jdbc.update("""
                insert into nutrition.food_import (dataset, release, sha256, imported_at, foods, skipped)
                values (:dataset, :release, :sha, :at, :rows, 0)
                on conflict (dataset, release) do update set imported_at = excluded.imported_at, foods = excluded.foods""",
                new MapSqlParameterSource("dataset", DATASET).addValue("release", release).addValue("sha", sha(release))
                        .addValue("at", clock.instant().atOffset(ZoneOffset.UTC)).addValue("rows", rows));
    }

    private static String sha(String text) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException(impossible);
        }
    }
}
