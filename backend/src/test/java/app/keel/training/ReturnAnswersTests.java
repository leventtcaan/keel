package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import app.keel.training.ReturnAnswers.Answer;
import app.keel.training.ReturnAnswers.Choice;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * V49 and its store (K-1020, ADR-077 Ek 8): one answer per account, the newest; a choice the contract does not name never
 * reaches the table; the answer reads back as it was given, in the program's own reading of a break.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Import(PostgresTestConfiguration.class)
class ReturnAnswersTests {

    private static final LocalDate GAP_FROM = LocalDate.of(2026, 9, 20);
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 15);
    private static final app.keel.engine.Parameters P = app.keel.engine.RepositoryParameters.forSex(app.keel.engine.Sex.MALE);
    private static final Instant AT = Instant.parse("2026-10-14T08:00:00Z");

    @Autowired
    ReturnAnswers answers;

    @Autowired
    JdbcClient jdbc;

    private static AccountId account() {
        return new AccountId(UUID.randomUUID());
    }

    @Test
    void anAccountWithNoAnswerHasNone() {
        assertThat(answers.of(account())).isEmpty();
        assertThat(answers.breakFrom(account(), java.util.Optional.of(GAP_FROM), TODAY, ZoneOffset.UTC, P)).contains(GAP_FROM);
    }

    @Test
    void anAnswerReadsBackAsItWasGiven() {
        AccountId account = account();

        answers.save(account, Choice.PICK_UP, GAP_FROM, AT);

        assertThat(answers.of(account)).contains(new Answer(Choice.PICK_UP, GAP_FROM, AT));
        assertThat(answers.breakFrom(account, java.util.Optional.of(GAP_FROM.minusDays(3)), TODAY, ZoneOffset.UTC, P)).as("picked up from this session").isEmpty();
        assertThat(answers.breakFrom(account, java.util.Optional.of(GAP_FROM.plusDays(1)), TODAY, ZoneOffset.UTC, P)).as("a later session is not the one answered").isPresent();
    }

    @Test
    void theNewestAnswerReplacesTheOneBeforeItAndIsTheOnlyRow() {
        AccountId account = account();
        answers.save(account, Choice.PICK_UP, GAP_FROM, AT);

        answers.save(account, Choice.EASE_BACK, GAP_FROM.plusDays(9), AT.plusSeconds(60));

        assertThat(answers.of(account)).contains(new Answer(Choice.EASE_BACK, GAP_FROM.plusDays(9), AT.plusSeconds(60)));
        assertThat(jdbc.sql("select count(*) from training.return_answer where account_id = :a").param("a", account.value()).query(Integer.class).single())
                .isEqualTo(1);
    }

    @Test
    void anotherAccountsAnswerIsNotThisOnes() {
        AccountId mine = account();
        answers.save(account(), Choice.PICK_UP, GAP_FROM, AT);

        assertThat(answers.of(mine)).isEmpty();
    }

    @Test
    void aChoiceTheContractDoesNotNameIsRefusedByTheTable() {
        assertThatThrownBy(() -> jdbc.sql("""
                insert into training.return_answer (account_id, choice, gap_from, answered_at) values (:a, 'GIVE_UP', :gap, :at)""")
                .param("a", UUID.randomUUID()).param("gap", GAP_FROM).param("at", OffsetDateTime.parse("2026-10-14T08:00:00Z")).update())
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
