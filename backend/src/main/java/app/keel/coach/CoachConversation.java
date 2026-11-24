package app.keel.coach;

import app.keel.shared.AccountId;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/**
 * The conversation with the coach as the server keeps it (ADR-092 #3): the user's words and the coach's replies — the model's
 * checked words, or only the engine's sentence's key — for {@code coach_history_days}, then the nightly cleanup deletes them
 * ({@link CoachCleanup}). The last few go to the model with the next question; the user may clear all of it, and it goes
 * with the account and with either consent. Health-adjacent: never in a log (V3).
 */
@Component
class CoachConversation {

    enum Role { USER, COACH }

    /** One message: {@code text} is the user's words or the model's checked reply; absent, the coach's was the engine's sentence ({@code copyKey}). */
    record Message(UUID id, Role role, String text, String copyKey, Topic topic, UUID decisionId, Instant at) {

        @Override
        public String toString() {
            return "Message[" + role + "]"; // what was said is health data (V3)
        }
    }

    private final JdbcClient jdbc;
    private final Clock clock;
    private final CoachLimits limits;

    CoachConversation(JdbcClient jdbc, Clock clock, CoachLimits limits) {
        this.jdbc = jdbc;
        this.clock = clock;
        this.limits = limits;
    }

    void append(AccountId account, Role role, String text, String copyKey, Topic topic, UUID decisionId) {
        jdbc.sql("""
                insert into coach.message (id, account_id, role, text, copy_key, topic, decision_id, created_at)
                values (:id, :account, :role, :text, :copyKey, :topic, :decision, :at)""")
                .param("id", UUID.randomUUID()).param("account", account.value()).param("role", role.name()).param("text", text).param("copyKey", copyKey)
                .param("topic", topic == null ? null : topic.name()).param("decision", decisionId).param("at", now()).update();
    }

    /** The last messages, oldest first, at most one page (coach_history_page). */
    List<Message> history(AccountId account) {
        List<Message> latest = new ArrayList<>(jdbc.sql("""
                select id, role, text, copy_key, topic, decision_id, created_at from coach.message where account_id = :account
                order by seq desc limit :limit""").param("account", account.value()).param("limit", limits.historyPage())
                .query((row, n) -> new Message(row.getObject("id", UUID.class), Role.valueOf(row.getString("role")), row.getString("text"),
                        row.getString("copy_key"), row.getString("topic") == null ? null : Topic.valueOf(row.getString("topic")),
                        row.getObject("decision_id", UUID.class), row.getObject("created_at", OffsetDateTime.class).toInstant()))
                .list());
        Collections.reverse(latest);
        return latest;
    }

    /** What goes to the model before the next question: the last few messages with words in them (the engine's sentences are not the model's to continue). */
    List<Turn> turns(AccountId account) {
        List<Message> latest = new ArrayList<>(jdbc.sql("""
                select role, text from coach.message where account_id = :account and text is not null
                order by seq desc limit :limit""").param("account", account.value()).param("limit", limits.historyTurnsInPrompt())
                .query((row, n) -> new Message(null, Role.valueOf(row.getString("role")), row.getString("text"), null, null, null, null)).list());
        Collections.reverse(latest);
        return latest.stream().map(message -> message.role() == Role.USER ? Turn.user(message.text()) : Turn.assistant(message.text())).toList();
    }

    void clear(AccountId account) {
        jdbc.sql("delete from coach.message where account_id = :account").param("account", account.value()).update();
    }

    /** Messages older than {@code coach_history_days} before {@code now}. */
    int purge(Instant now) {
        return jdbc.sql("delete from coach.message where created_at < :before").param("before", now.minus(java.time.Duration.ofDays(limits.historyDays())).atOffset(ZoneOffset.UTC))
                .update();
    }

    private OffsetDateTime now() {
        return clock.instant().atOffset(ZoneOffset.UTC);
    }
}
