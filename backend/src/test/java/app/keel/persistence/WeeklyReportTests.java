package app.keel.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;

/**
 * The weekly leading indicators (K-905, ADR-081): deploy/weekly-report.sql, the very file Levent runs on the server, on
 * synthetic rows in a real PostgreSQL. The fixture (report/leading-indicators-fixture.sql) names each account for what it
 * checks; the report is read "as of" 2025-10-27 12:00 UTC. The report reads several modules' tables, so it lives outside
 * every module (ADR-023: a module touches only its own schema) and is tested here, beside the migrations.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Import(PostgresTestConfiguration.class)
class WeeklyReportTests {

    private static final Path REPORT = Path.of("../deploy/weekly-report.sql");
    private static final String AS_OF = "2025-10-27 12:00+00";
    private static final String TOTAL = "total (window)";
    /** A group of one is enough to show a number: the tests of the definitions look at small synthetic groups. */
    private static final Map<String, String> EVERY_GROUP = Map.of("keel.min_cell", "1");
    private static final String FIXTURE_ACCOUNTS = "00000000-0000-0000-0000-0000000000%";
    /** The columns, and only these: counts and shares of groups of accounts, never an account or a health value. */
    private static final List<String> COLUMNS = List.of("cohort", "started", "first_call_reached", "first_call_median_days",
            "week_2_eligible", "week_2_active", "week_2_retention_pct", "plan_change_seen", "plan_change_seen_pct");

    @Autowired
    DataSource dataSource;

    @Autowired
    JdbcClient jdbc;

    @BeforeEach
    void theSyntheticAccounts() {
        removeTheSyntheticRows();
        new ResourceDatabasePopulator(new ClassPathResource("report/leading-indicators-fixture.sql")).execute(dataSource);
    }

    @AfterEach
    void removeTheSyntheticRows() {
        for (String table : List.of("decision.weekly_call", "training.workout", "training.cardio_session", "measurement.weigh_in",
                "measurement.waist", "measurement.photo_check", "nutrition.meal")) {
            jdbc.sql("delete from " + table + " where account_id::text like :accounts").param("accounts", FIXTURE_ACCOUNTS).update();
        }
        jdbc.sql("delete from identity.account where id::text like :accounts").param("accounts", FIXTURE_ACCOUNTS).update();
    }

    @Test
    void theReportIsOneRowPerSignUpWeekNewestFirstThenTheTotalAndNothingElse() throws Exception {
        List<Map<String, Object>> rows = report(AS_OF, EVERY_GROUP);

        assertThat(rows).extracting(row -> row.get("cohort")).containsExactly("2025-10-13", "2025-09-29", "2025-09-01", TOTAL);
        assertThat(rows.getFirst().keySet()).containsExactlyElementsOf(COLUMNS);
    }

    @Test
    void timeToFirstValueIsDaysToTheFirstRealCall() throws Exception {
        List<Map<String, Object>> rows = report(AS_OF, EVERY_GROUP);

        // 2025-09-29: a1 day 7, a2 day 12 ("no call yet" on day 5 is not one), a5 just over 14; a3 and a4 have none.
        assertThat(row(rows, "2025-09-29")).containsEntry("started", 5L).containsEntry("first_call_reached", 3L);
        assertThat(number(row(rows, "2025-09-29"), "first_call_median_days")).isEqualByComparingTo("12.0");
        // 2025-10-13: b1 day 7 (declined is still a call), e1 day 9; b2's call is after the report; the median of two is the middle.
        assertThat(row(rows, "2025-10-13")).containsEntry("started", 3L).containsEntry("first_call_reached", 2L);
        assertThat(number(row(rows, "2025-10-13"), "first_call_median_days")).isEqualByComparingTo("8.0");
        assertThat(number(row(rows, TOTAL), "first_call_median_days")).isEqualByComparingTo("9.0");
    }

    @Test
    void weekTwoRetentionCountsOnlyWhatThePersonDidAndOnlyAccountsTwoWeeksOld() throws Exception {
        List<Map<String, Object>> rows = report(AS_OF, EVERY_GROUP);

        // a1 (workout), a2 (weigh-in, check-in), a5 (meal) are active in days 7-13; a3 did nothing; a4 only has what arrives by itself.
        assertThat(row(rows, "2025-09-29")).containsEntry("week_2_eligible", 5L).containsEntry("week_2_active", 3L);
        assertThat(number(row(rows, "2025-09-29"), "week_2_retention_pct")).isEqualByComparingTo("60.0");
        // Of the second sign-up week only e1 is two weeks old (exactly: the edge counts); b1 and b2 are not yet in the share.
        assertThat(row(rows, "2025-10-13")).containsEntry("week_2_eligible", 1L).containsEntry("week_2_active", 1L);
        assertThat(number(row(rows, "2025-10-13"), "week_2_retention_pct")).isEqualByComparingTo("100.0");
        assertThat(row(rows, TOTAL)).containsEntry("week_2_eligible", 14L).containsEntry("week_2_active", 8L);
        assertThat(number(row(rows, TOTAL), "week_2_retention_pct")).isEqualByComparingTo("57.1");
    }

    @Test
    void aSourceThatHasOnlyADayIsCountedByThatDayOnTheEdgesOfTheSecondWeek() throws Exception {
        List<Map<String, Object>> rows = report(AS_OF, EVERY_GROUP);

        // Accounts made 2025-09-01 22:00 UTC; the second week is the days 09-08 to 09-14. For each of cardio, waist and photo
        // check, one account has rows on 09-08 and 09-14 (active), one on 09-07 and 09-15 (not); the same for a workout, whose
        // 00:30 on 09-08 is under seven days after the sign-up and still counts for its day.
        assertThat(row(rows, "2025-09-01")).containsEntry("started", 8L).containsEntry("week_2_eligible", 8L).containsEntry("week_2_active", 4L);
        assertThat(number(row(rows, "2025-09-01"), "week_2_retention_pct")).isEqualByComparingTo("50.0");
    }

    @Test
    void thePlanChangedShareCountsCallsThatMovedThePlanAndWereAppliedEvenIfUndoneLater() throws Exception {
        List<Map<String, Object>> rows = report(AS_OF, EVERY_GROUP);

        // a1 applied, a5 applied then undone; a2's call changes nothing; e1 applied; b1's was declined without being applied.
        assertThat(row(rows, "2025-09-29")).containsEntry("plan_change_seen", 2L);
        assertThat(number(row(rows, "2025-09-29"), "plan_change_seen_pct")).isEqualByComparingTo("40.0");
        assertThat(row(rows, "2025-10-13")).containsEntry("plan_change_seen", 1L);
        assertThat(number(row(rows, "2025-10-13"), "plan_change_seen_pct")).isEqualByComparingTo("33.3");
        assertThat(row(rows, TOTAL)).containsEntry("started", 16L).containsEntry("plan_change_seen", 3L);
        assertThat(number(row(rows, TOTAL), "plan_change_seen_pct")).isEqualByComparingTo("18.8");
    }

    @Test
    void aGroupSmallerThanTheMinimumShowsOnlyItsSizeAndNoShareDescribesOnePerson() throws Exception {
        List<Map<String, Object>> rows = report(AS_OF, Map.of()); // keel.min_cell unset: 5

        // 2025-10-13 has 3 accounts: its size and nothing else.
        assertThat(row(rows, "2025-10-13")).containsEntry("started", 3L).containsEntry("first_call_reached", null)
                .containsEntry("first_call_median_days", null).containsEntry("week_2_eligible", null).containsEntry("week_2_active", null)
                .containsEntry("week_2_retention_pct", null).containsEntry("plan_change_seen", null).containsEntry("plan_change_seen_pct", null);
        // 2025-09-29 has 5 accounts, 5 of them two weeks old, so the retention and plan change are shown; only 3 reached a first call,
        // fewer than 5, so that count and its median are not.
        assertThat(row(rows, "2025-09-29")).containsEntry("started", 5L).containsEntry("first_call_reached", null)
                .containsEntry("first_call_median_days", null).containsEntry("week_2_eligible", 5L).containsEntry("week_2_active", 3L)
                .containsEntry("plan_change_seen", 2L);
        assertThat(number(row(rows, "2025-09-29"), "week_2_retention_pct")).isEqualByComparingTo("60.0");
        // 2025-09-01 has 8 and none reached a first call.
        assertThat(row(rows, "2025-09-01")).containsEntry("first_call_reached", null).containsEntry("first_call_median_days", null)
                .containsEntry("week_2_eligible", 8L);
        // The total of 16 is large enough for everything, 5 reaching a first call being the smallest cell allowed.
        assertThat(row(rows, TOTAL)).containsEntry("first_call_reached", 5L);
        assertThat(number(row(rows, TOTAL), "first_call_median_days")).isEqualByComparingTo("9.0");
    }

    @Test
    void aShareWhoseOwnGroupIsTooSmallIsEmptyEvenWhenTheCohortIsBigEnough() throws Exception {
        // Raising the minimum to 6: 2025-09-29 (5 accounts) is now too small for everything; 2025-09-01 (8) is not.
        List<Map<String, Object>> rows = report(AS_OF, Map.of("keel.min_cell", "6"));

        assertThat(row(rows, "2025-09-29")).containsEntry("started", 5L).containsEntry("week_2_retention_pct", null)
                .containsEntry("plan_change_seen_pct", null);
        assertThat(row(rows, "2025-09-01")).containsEntry("week_2_eligible", 8L);
        assertThat(number(row(rows, "2025-09-01"), "plan_change_seen_pct")).isEqualByComparingTo("0.0");
    }

    @Test
    void anAccountMadeAfterTheReportOrBeyondTheWeeksShownCountsForNothing() throws Exception {
        // late (after) and old (July) are busy in the fixture and are in no number at the default eight weeks; cut to two weeks
        // back from the report's week, the older sign-up weeks go too.
        List<Map<String, Object>> rows = report(AS_OF, Map.of("keel.min_cell", "1", "keel.cohort_weeks", "2"));

        assertThat(rows).extracting(row -> row.get("cohort")).containsExactly("2025-10-13", TOTAL);
        assertThat(row(rows, TOTAL)).containsEntry("started", 3L);
    }

    @Test
    void withNoAccountsInTheWindowTheTotalIsItsSizeAloneAndTheSharesAreEmptyNotZero() throws Exception {
        List<Map<String, Object>> rows = report("2020-01-01 00:00+00", Map.of());

        assertThat(rows).hasSize(1);
        assertThat(rows.getFirst()).containsEntry("cohort", TOTAL).containsEntry("started", 0L).containsEntry("first_call_reached", null)
                .containsEntry("first_call_median_days", null).containsEntry("week_2_retention_pct", null)
                .containsEntry("plan_change_seen_pct", null);
    }

    @Test
    void unsetSettingsMeanNowSevenDaysEightWeeksAndFiveToShowAGroup() throws Exception {
        // No keel.* setting at all: the report still runs. The synthetic accounts are long past the eight weeks shown.
        List<Map<String, Object>> rows = report(null, Map.of());

        assertThat(rows).isNotEmpty();
        assertThat(rows.getLast()).containsEntry("cohort", TOTAL);
        assertThat(rows.getFirst().keySet()).containsExactlyElementsOf(COLUMNS);
    }

    @Test
    void theReportWritesNothing() throws Exception {
        // The session weekly-report.sh opens (PGOPTIONS default_transaction_read_only=on) refuses any write (SQLSTATE 25006,
        // read_only_sql_transaction); the report, one select, still runs in it. (JDBC's setReadOnly does nothing in autocommit.)
        try (Connection connection = dataSource.getConnection(); Statement statement = connection.createStatement()) {
            try {
                statement.execute("set default_transaction_read_only = on");
                statement.execute("set keel.report_as_of = '" + AS_OF + "'");
                assertThat(statement.execute(Files.readString(REPORT))).isTrue();
                assertThatThrownBy(() -> statement.execute("insert into identity.account (id, apple_subject, created_at) "
                        + "values (gen_random_uuid(), 'synthetic-write', now())"))
                        .isInstanceOfSatisfying(SQLException.class, refused -> assertThat(refused.getSQLState()).isEqualTo("25006"));
            } finally {
                statement.execute("reset all");
            }
        }
    }

    /** Runs the file as is, on one connection with the settings the file reads (psql's -c or PGOPTIONS do the same on the server). */
    private List<Map<String, Object>> report(String asOf, Map<String, String> settings) throws SQLException, IOException {
        String sql = Files.readString(REPORT);
        try (Connection connection = dataSource.getConnection(); Statement statement = connection.createStatement()) {
            if (asOf != null) {
                statement.execute("set keel.report_as_of = '" + asOf + "'");
            }
            for (Map.Entry<String, String> setting : settings.entrySet()) {
                statement.execute("set " + setting.getKey() + " = '" + setting.getValue() + "'");
            }
            try (ResultSet result = statement.executeQuery(sql)) {
                ResultSetMetaData meta = result.getMetaData();
                List<Map<String, Object>> rows = new ArrayList<>();
                while (result.next()) {
                    Map<String, Object> row = new LinkedHashMap<>();
                    for (int column = 1; column <= meta.getColumnCount(); column++) {
                        row.put(meta.getColumnLabel(column), result.getObject(column));
                    }
                    rows.add(row);
                }
                return rows;
            } finally {
                statement.execute("reset all");
            }
        }
    }

    private static Map<String, Object> row(List<Map<String, Object>> rows, String cohort) {
        return rows.stream().filter(row -> cohort.equals(row.get("cohort"))).findFirst().orElseThrow();
    }

    private static BigDecimal number(Map<String, Object> row, String column) {
        return (BigDecimal) row.get(column);
    }
}
