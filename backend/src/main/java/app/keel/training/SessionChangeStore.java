package app.keel.training;

import app.keel.shared.AccountId;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/** The user's changes to a week's sessions (K-964, V41 training.session_change): one row per program day and week. */
@Repository
class SessionChangeStore {

    /** A change kept: the program day, the Monday of its week, the change. */
    record Row(UUID programDayId, LocalDate weekOf, TodayChanges.Change change) {
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
        return rows(account, "and week_of = :monday", monday).stream().collect(Collectors.toMap(Row::programDayId, Row::change));
    }

    /** Every change kept, oldest week first (the account's data, K-214). */
    List<Row> all(AccountId account) {
        return rows(account, "", null);
    }

    /** The day's change in that week, in place of the one kept. The caller holds the program's lock (ProgramStore#locked). */
    void put(AccountId account, UUID programDayId, LocalDate monday, TodayChanges.Change change) {
        jdbc.sql("""
                insert into training.session_change (account_id, program_day_id, week_of, on_date, skipped, short_version, swaps)
                values (:account, :day, :monday, :on, :skipped, :short, cast(:swaps as jsonb))
                on conflict (account_id, program_day_id, week_of) do update set on_date = excluded.on_date, skipped = excluded.skipped,
                    short_version = excluded.short_version, swaps = excluded.swaps""")
                .param("account", account.value()).param("day", programDayId).param("monday", monday).param("on", change.onDate())
                .param("skipped", change.skipped()).param("short", change.shortVersion()).param("swaps", json.writeValueAsString(change.swaps()))
                .update();
    }

    private List<Row> rows(AccountId account, String where, LocalDate monday) {
        var query = jdbc.sql("""
                select program_day_id, week_of, on_date, skipped, short_version, swaps::text as swaps from training.session_change
                where account_id = :account %s order by week_of, program_day_id""".formatted(where)).param("account", account.value());
        if (monday != null) {
            query = query.param("monday", monday);
        }
        return query.query((row, n) -> new Row(row.getObject("program_day_id", UUID.class), row.getObject("week_of", LocalDate.class),
                new TodayChanges.Change(row.getObject("on_date", LocalDate.class), row.getBoolean("skipped"), row.getBoolean("short_version"),
                        json.readValue(row.getString("swaps"), SWAPS)))).list();
    }
}
