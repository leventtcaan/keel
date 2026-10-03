package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.persistence.PostgresTestConfiguration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * V30's backfill (K-535): a program made before the history existed starts it — its days, from the time it was made. On
 * a database of its own, migrated to V29 with programs in it, then to V30: the application's database starts empty, so
 * its own run of V30 copies nothing.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Import(PostgresTestConfiguration.class)
class ProgramHistoryBackfillTests {

    @Autowired
    PostgreSQLContainer postgres;

    @Autowired
    JdbcClient jdbc;

    @Test
    void aProgramMadeBeforeTheHistoryStartsItWithItsDaysFromWhenItWasMade() {
        String database = "backfill_" + UUID.randomUUID().toString().replace("-", "");
        jdbc.sql("create database " + database).update();
        DriverManagerDataSource source = new DriverManagerDataSource(postgres.getJdbcUrl().replace("/" + postgres.getDatabaseName(), "/" + database),
                postgres.getUsername(), postgres.getPassword());
        Flyway.configure().dataSource(source).locations("classpath:db/migration").target("29").load().migrate();
        JdbcClient old = JdbcClient.create(source);
        OffsetDateTime threeMade = OffsetDateTime.of(2026, 8, 3, 9, 15, 0, 0, ZoneOffset.UTC);
        OffsetDateTime twoMade = OffsetDateTime.of(2026, 9, 14, 18, 0, 0, 0, ZoneOffset.UTC);
        UUID three = program(old, threeMade, 3);
        UUID two = program(old, twoMade, 2);

        Flyway.configure().dataSource(source).locations("classpath:db/migration").target("30").load().migrate();

        record Row(UUID account, int sessions, OffsetDateTime from) {
        }
        List<Row> history = old.sql("select account_id, sessions_per_week, effective_from from training.program_history order by effective_from")
                .query((row, n) -> new Row(row.getObject("account_id", UUID.class), row.getInt("sessions_per_week"),
                        row.getObject("effective_from", OffsetDateTime.class)))
                .list();
        assertThat(history).containsExactly(new Row(three, 3, threeMade), new Row(two, 2, twoMade));
    }

    /** A program of {@code days} days made at {@code made}, for a new account; returns the account. */
    private static UUID program(JdbcClient db, OffsetDateTime made, int days) {
        UUID account = UUID.randomUUID();
        UUID program = UUID.randomUUID();
        db.sql("insert into training.program (id, account_id, source, created_at) values (:id, :account, 'OWN', :made)")
                .param("id", program).param("account", account).param("made", made).update();
        for (int d = 0; d < days; d++) {
            db.sql("insert into training.program_day (id, program_id, account_id, seq, name) values (:id, :program, :account, :seq, 'Day')")
                    .param("id", UUID.randomUUID()).param("program", program).param("account", account).param("seq", d).update();
        }
        return account;
    }
}
