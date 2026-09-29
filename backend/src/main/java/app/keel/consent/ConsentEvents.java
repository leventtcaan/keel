package app.keel.consent;

import app.keel.shared.AccountId;
import java.sql.Array;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** The append-only consent log (K-204): write a grant or a withdrawal; read the latest per account and kind. */
@Repository
class ConsentEvents {

    enum Action { GRANTED, WITHDRAWN }

    record Event(ConsentKind kind, Action action, String textVersion, String provider, List<String> dataTypes, Instant at) {
    }

    private final JdbcClient jdbc;
    private final Clock clock;

    ConsentEvents(JdbcClient jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    Optional<Event> latest(AccountId account, ConsentKind kind) {
        return jdbc.sql("""
                select kind, action, text_version, provider, data_types, occurred_at from consent.consent_event
                where account_id = :account and kind = :kind order by seq desc limit 1""")
                .param("account", account.value()).param("kind", kind.name())
                .query((row, n) -> new Event(ConsentKind.valueOf(row.getString("kind")), Action.valueOf(row.getString("action")),
                        row.getString("text_version"), row.getString("provider"), strings(row.getArray("data_types")),
                        row.getObject("occurred_at", OffsetDateTime.class).toInstant()))
                .optional();
    }

    Event append(AccountId account, ConsentKind kind, Action action, String textVersion, String provider, List<String> dataTypes) {
        Instant now = clock.instant().truncatedTo(ChronoUnit.MICROS); // what PostgreSQL keeps: the answer matches a later read
        jdbc.sql("""
                insert into consent.consent_event (id, account_id, kind, action, text_version, provider, data_types, occurred_at)
                values (:id, :account, :kind, :action, :version, :provider, :types, :at)""")
                .param("id", UUID.randomUUID()).param("account", account.value()).param("kind", kind.name())
                .param("action", action.name()).param("version", textVersion).param("provider", provider)
                .param("types", dataTypes == null ? null : dataTypes.toArray(String[]::new))
                .param("at", now.atOffset(ZoneOffset.UTC)).update();
        return new Event(kind, action, textVersion, provider, dataTypes, now);
    }

    private static List<String> strings(Array array) throws SQLException {
        return array == null ? null : Arrays.asList((String[]) array.getArray());
    }
}
