package app.keel.training;

import app.keel.shared.AccountId;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.json.JsonMapper;

/**
 * The program review's change log (K-956, ADR-073 #3): each change applied to the account's program, oldest first, with the
 * suggestion as shown and the program before and after it; an undone change stays, with when. A new program starts with
 * none (ProgramStore#replace).
 */
@Repository
class ReviewChangeStore {

    /** A change of the log; {@code undoneAt} null while it is in force. */
    record Row(UUID id, Instant appliedAt, Instant undoneAt, ProgramReviews.Step step) {
    }

    private final JdbcClient jdbc;
    private final JsonMapper json;

    ReviewChangeStore(JdbcClient jdbc, JsonMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    /** The changes after the ones logged, in order. The caller holds the program's lock (ProgramStore#locked). */
    void add(AccountId account, List<ProgramReviews.Step> steps, Instant at) {
        for (ProgramReviews.Step step : steps) {
            jdbc.sql("""
                    insert into training.program_review_change (id, account_id, seq, suggestion, program_before, program_after, applied_at)
                    values (:id, :account, (select coalesce(max(seq), 0) + 1 from training.program_review_change where account_id = :account),
                            cast(:suggestion as jsonb), cast(:before as jsonb), cast(:after as jsonb), :at)""")
                    .param("id", UUID.randomUUID()).param("account", account.value()).param("suggestion", json.writeValueAsString(step.suggestion()))
                    .param("before", json.writeValueAsString(step.before())).param("after", json.writeValueAsString(step.after()))
                    .param("at", at.atOffset(ZoneOffset.UTC)).update();
        }
    }

    /** Every change of the log, oldest first. */
    List<Row> all(AccountId account) {
        return jdbc.sql("""
                select id, applied_at, undone_at, suggestion::text as suggestion, program_before::text as before, program_after::text as after
                from training.program_review_change where account_id = :account order by seq""")
                .param("account", account.value())
                .query((row, n) -> new Row(row.getObject("id", UUID.class), row.getObject("applied_at", OffsetDateTime.class).toInstant(),
                        Optional.ofNullable(row.getObject("undone_at", OffsetDateTime.class)).map(OffsetDateTime::toInstant).orElse(null),
                        new ProgramReviews.Step(json.readValue(row.getString("suggestion"), ProgramReviews.Suggestion.class),
                                json.readValue(row.getString("before"), ProgramStore.Program.class),
                                json.readValue(row.getString("after"), ProgramStore.Program.class))))
                .list();
    }

    /** The changes in force, oldest first, without the programs around them. */
    List<ProgramReviews.Applied> applied(AccountId account) {
        return jdbc.sql("""
                select id, applied_at, suggestion::text as suggestion from training.program_review_change
                where account_id = :account and undone_at is null order by seq""")
                .param("account", account.value())
                .query((row, n) -> new ProgramReviews.Applied(row.getObject("id", UUID.class), row.getObject("applied_at", OffsetDateTime.class).toInstant(),
                        json.readValue(row.getString("suggestion"), ProgramReviews.Suggestion.class)))
                .list();
    }

    /** The log emptied: the program was edited another way and the changes no longer undo onto it (K-964, ADR-073 Ek 2). */
    void clear(AccountId account) {
        jdbc.sql("delete from training.program_review_change where account_id = :account").param("account", account.value()).update();
    }

    void undo(AccountId account, List<UUID> ids, Instant at) {
        ids.forEach(id -> jdbc.sql("update training.program_review_change set undone_at = :at where account_id = :account and id = :id and undone_at is null")
                .param("account", account.value()).param("id", id).param("at", at.atOffset(ZoneOffset.UTC)).update());
    }
}
