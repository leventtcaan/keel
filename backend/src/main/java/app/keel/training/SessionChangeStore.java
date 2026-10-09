package app.keel.training;

import app.keel.shared.AccountId;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/**
 * The user's changes to a week's sessions (K-964, V41 training.session_change): one row per program day and week, with what
 * undoes the row a move or a skip wrote (K-995, V44).
 */
@Repository
class SessionChangeStore {

    /** A change kept: the program day, the Monday of its week, the change, and what undoes it (null: nothing). */
    record Row(UUID programDayId, LocalDate weekOf, TodayChanges.Change change, TodayChanges.Undo undo) {
    }

    private static final TypeReference<Map<String, String>> SWAPS = new TypeReference<>() {
    };

    private final JdbcClient jdbc;
    private final JsonMapper json;

    SessionChangeStore(JdbcClient jdbc, JsonMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    /** The changes to the week of {@code monday}, by program day. */
    Map<UUID, TodayChanges.Change> week(AccountId account, LocalDate monday) {
        return between(account, monday, monday).stream().collect(Collectors.toMap(Row::programDayId, Row::change));
    }

    /** What undoes the changes to the week of {@code monday}, by program day: the rows a move or a skip wrote (K-995). */
    Map<UUID, TodayChanges.Undo> undos(AccountId account, LocalDate monday) {
        return between(account, monday, monday).stream().filter(row -> row.undo() != null).collect(Collectors.toMap(Row::programDayId, Row::undo));
    }

    /** The changes to the weeks from the one of Monday {@code from} to the one of Monday {@code to}, oldest week first. */
    List<Row> between(AccountId account, LocalDate from, LocalDate to) {
        return rows(account, "and week_of between :from and :to", from, to);
    }

    /** The changes of these program days to the week of {@code monday} gone: the days re-lay that week (K-995). */
    void clear(AccountId account, LocalDate monday, Set<UUID> programDays) {
        programDays.forEach(day -> jdbc.sql("delete from training.session_change where account_id = :account and program_day_id = :day and week_of = :monday")
                .param("account", account.value()).param("day", day).param("monday", monday).update());
    }

    /** Every change kept, oldest week first (the account's data, K-214). */
    List<Row> all(AccountId account) {
        return rows(account, "", null, null);
    }

    /**
     * The day's change in that week, in place of the one kept; what undoes the row stays as it is (a short version, a swap).
     * The caller holds the program's lock (ProgramStore#locked).
     */
    void put(AccountId account, UUID programDayId, LocalDate monday, TodayChanges.Change change) {
        write(account, programDayId, monday, change, null, "");
    }

    /** The day's change in that week and what undoes it (null: nothing), both in place of the ones kept. Under the lock. */
    void put(AccountId account, UUID programDayId, LocalDate monday, TodayChanges.Kept kept) {
        write(account, programDayId, monday, kept.change(), kept.undo(), ", undo = excluded.undo");
    }

    private void write(AccountId account, UUID programDayId, LocalDate monday, TodayChanges.Change change, TodayChanges.Undo undo, String undoSet) {
        jdbc.sql("""
                insert into training.session_change (account_id, program_day_id, week_of, on_date, skipped, short_version, swaps, undo)
                values (:account, :day, :monday, :on, :skipped, :short, cast(:swaps as jsonb), cast(:undo as jsonb))
                on conflict (account_id, program_day_id, week_of) do update set on_date = excluded.on_date, skipped = excluded.skipped,
                    short_version = excluded.short_version, swaps = excluded.swaps%s""".formatted(undoSet))
                .param("account", account.value()).param("day", programDayId).param("monday", monday).param("on", change.onDate())
                .param("skipped", change.skipped()).param("short", change.shortVersion()).param("swaps", json.writeValueAsString(change.swaps()))
                .param("undo", undo == null ? null : json.writeValueAsString(undo)).update();
    }

    private List<Row> rows(AccountId account, String where, LocalDate from, LocalDate to) {
        var query = jdbc.sql("""
                select program_day_id, week_of, on_date, skipped, short_version, swaps::text as swaps, undo::text as undo
                from training.session_change where account_id = :account %s order by week_of, program_day_id""".formatted(where))
                .param("account", account.value());
        if (from != null) {
            query = query.param("from", from).param("to", to);
        }
        return query.query((row, n) -> {
            String undo = row.getString("undo");
            return new Row(row.getObject("program_day_id", UUID.class), row.getObject("week_of", LocalDate.class),
                    new TodayChanges.Change(row.getObject("on_date", LocalDate.class), row.getBoolean("skipped"), row.getBoolean("short_version"),
                            json.readValue(row.getString("swaps"), SWAPS)),
                    undo == null ? null : json.readValue(undo, TodayChanges.Undo.class));
        }).list();
    }
}
