package app.keel.coach;

import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/**
 * What the user asked the coach to remember about them (ADR-092 #3): at most {@code coach_memory_max_items} short sentences
 * in the user's own words, written only by the user's own "remember this" — never by the model — and viewable, correctable and
 * deletable by them. They go to the model as facts about the person (never as numbers: the reply check allows none of them) and
 * must be what the coach could say itself: no phrase the reply rules or the forbidden list stop. A conversation that ends with the
 * AI consent, the health data consent or the account ends them too (CoachAccountData).
 */
@Component
class CoachMemory {

    record Item(UUID id, String text, Instant at) {

        @Override
        public String toString() {
            return "Item"; // the user's words: health data (V3)
        }
    }

    private final JdbcClient jdbc;
    private final Clock clock;
    private final CoachLimits limits;
    private final ForbiddenWords forbidden = ForbiddenWords.fromClasspath();
    private final ReplyRules rules = ReplyRules.fromClasspath();

    CoachMemory(JdbcClient jdbc, Clock clock, CoachLimits limits) {
        this.jdbc = jdbc;
        this.clock = clock;
        this.limits = limits;
    }

    int maxItems() {
        return limits.memoryMaxItems();
    }

    List<Item> list(AccountId account) {
        return jdbc.sql("select id, text, created_at from coach.memory_item where account_id = :account order by created_at, id")
                .param("account", account.value()).query((row, n) -> new Item(row.getObject("id", UUID.class), row.getString("text"),
                        row.getObject("created_at", OffsetDateTime.class).toInstant())).list();
    }

    /** The user's "remember this": VALIDATION_FAILED for words the coach could not say, CONFLICT when the list is full. */
    Item add(AccountId account, String text) {
        String kept = checked(text);
        // One statement, so two requests at once never go over the limit.
        UUID id = UUID.randomUUID();
        int added = jdbc.sql("""
                insert into coach.memory_item (id, account_id, text, created_at)
                select :id, :account, :text, :at where (select count(*) from coach.memory_item where account_id = :account) < :max""")
                .param("id", id).param("account", account.value()).param("text", kept).param("at", clock.instant().atOffset(ZoneOffset.UTC))
                .param("max", limits.memoryMaxItems()).update();
        if (added == 0) {
            throw new ApiException(ErrorCode.CONFLICT);
        }
        return new Item(id, kept, clock.instant());
    }

    Optional<Item> correct(AccountId account, UUID id, String text) {
        String kept = checked(text);
        int updated = jdbc.sql("update coach.memory_item set text = :text where id = :id and account_id = :account").param("text", kept).param("id", id)
                .param("account", account.value()).update();
        return updated == 0 ? Optional.empty() : list(account).stream().filter(item -> item.id().equals(id)).findFirst();
    }

    boolean delete(AccountId account, UUID id) {
        return jdbc.sql("delete from coach.memory_item where id = :id and account_id = :account").param("id", id).param("account", account.value()).update() > 0;
    }

    void clear(AccountId account) {
        jdbc.sql("delete from coach.memory_item where account_id = :account").param("account", account.value()).update();
    }

    /** The sentence as it is kept: trimmed, one line, within the limit, and nothing the coach may not say. */
    String checked(String text) {
        if (text == null) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        String kept = text.strip().replaceAll("\\s+", " ");
        if (kept.isEmpty() || kept.length() > limits.memoryMaxChars() || kept.chars().anyMatch(Character::isISOControl)
                || !forbidden.found(kept).isEmpty() || !rules.found(kept).isEmpty()) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        return kept;
    }
}
