package app.keel.decision;

import app.keel.shared.AccountId;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** The answers to the coach's own questions (K-512, ADR-039): one per question and occurrence. Health data. */
@Repository
class PromptStore {

    private final JdbcClient jdbc;

    PromptStore(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** The questions answered, as "rule/key". */
    Set<String> answered(AccountId account) {
        return jdbc.sql("select rule, key from decision.prompt_answer where account_id = :account").param("account", account.value())
                .query((row, n) -> row.getString("rule") + "/" + row.getString("key")).set();
    }

    /** The answer kept: the first one given (an answer again, from a retry, changes nothing). */
    String answer(AccountId account, String rule, String key, String choice, Instant now) {
        jdbc.sql("""
                insert into decision.prompt_answer (id, account_id, rule, key, choice, answered_at)
                values (:id, :account, :rule, :key, :choice, :now) on conflict (account_id, rule, key) do nothing""")
                .param("id", UUID.randomUUID()).param("account", account.value()).param("rule", rule).param("key", key).param("choice", choice)
                .param("now", now.atOffset(ZoneOffset.UTC)).update();
        return jdbc.sql("select choice from decision.prompt_answer where account_id = :account and rule = :rule and key = :key")
                .param("account", account.value()).param("rule", rule).param("key", key).query(String.class).single();
    }

    /** Every answer, oldest first (the export). */
    List<Map<String, Object>> all(AccountId account) {
        return jdbc.sql("select rule, key, choice, answered_at from decision.prompt_answer where account_id = :account order by answered_at, rule")
                .param("account", account.value())
                .query((row, n) -> Map.<String, Object>of("rule", row.getString("rule"), "key", row.getString("key"), "choice", row.getString("choice"),
                        "answeredAt", row.getObject("answered_at", OffsetDateTime.class).toInstant()))
                .list();
    }
}
