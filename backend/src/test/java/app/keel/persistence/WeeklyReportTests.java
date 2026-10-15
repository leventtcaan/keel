package app.keel.persistence;

import static org.assertj.core.api.Assertions.assertThat;

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
        List<Map<String, Object>> rows = report(AS_OF, Map.of());

        assertThat(rows).extracting(row -> row.get("cohort")).containsExactly("2025-10-13", "2025-09-29", "total");
        assertThat(rows.getFirst().keySet()).containsExactlyElementsOf(COLUMNS);
    }

    @Test
    void timeToFirstValueIsDaysToTheFirstRealCall() throws Exception {
        List<Map<String, Object>> rows = report(AS_OF, Map.of());

        // 2025-09-29: a1 day 7, a2 day 12 ("no call yet" on day 5 is not one), a5 just over 14; a3 and a4 have none.
        assertThat(row(rows, "2025-09-29")).containsEntry("started", 5L).containsEntry("first_call_reached", 3L);
        assertThat(number(row(rows, "2025-09-29"), "first_call_median_days")).isEqualByComparingTo("12.0");
        // 2025-10-13: b1 day 7 (declined is still a call), e1 day 9; b2's call is after the report; the median of two is the middle.
        assertThat(row(rows, "2025-10-13")).containsEntry("started", 3L).containsEntry("first_call_reached", 2L);
        assertThat(number(row(rows, "2025-10-13"), "first_call_median_days")).isEqualByComparingTo("8.0");
        assertThat(number(row(rows, "total"), "first_call_median_days")).isEqualByComparingTo("9.0");
    }

    @Test
    void weekTwoRetentionCountsOnlyWhatThePersonDidAndOnlyAccountsTwoWeeksOld() throws Exception {
        List<Map<String, Object>> rows = report(AS_OF, Map.of());

        // a1 (workout), a2 (weigh-in, check-in), a5 (meal) are active in days 7-14; a3 did nothing; a4 only has what arrives by itself.
        assertThat(row(rows, "2025-09-29")).containsEntry("week_2_eligible", 5L).containsEntry("week_2_active", 3L);
        assertThat(number(row(rows, "2025-09-29"), "week_2_retention_pct")).isEqualByComparingTo("60.0");
        // Of the second sign-up week only e1 is two weeks old (exactly: the edge counts); b1 and b2 are not yet in the share.
        assertThat(row(rows, "2025-10-13")).containsEntry("week_2_eligible", 1L).containsEntry("week_2_active", 1L);
        assertThat(number(row(rows, "2025-10-13"), "week_2_retention_pct")).isEqualByComparingTo("100.0");
        assertThat(row(rows, "total")).containsEntry("week_2_eligible", 6L).containsEntry("week_2_active", 4L);
        assertThat(number(row(rows, "total"), "week_2_retention_pct")).isEqualByComparingTo("66.7");
    }

    @Test
    void thePlanChangedShareCountsCallsThatMovedThePlanAndWereAppliedEvenIfUndoneLater() throws Exception {
        List<Map<String, Object>> rows = report(AS_OF, Map.of());

        // a1 applied, a5 applied then undone; a2's call changes nothing; e1 applied; b1's was declined without being applied.
        assertThat(row(rows, "2025-09-29")).containsEntry("plan_change_seen", 2L);
        assertThat(number(row(rows, "2025-09-29"), "plan_change_seen_pct")).isEqualByComparingTo("40.0");
        assertThat(row(rows, "2025-10-13")).containsEntry("plan_change_seen", 1L);
        assertThat(number(row(rows, "2025-10-13"), "plan_change_seen_pct")).isEqualByComparingTo("33.3");
        assertThat(row(rows, "total")).containsEntry("started", 8L).containsEntry("plan_change_seen", 3L);
        assertThat(number(row(rows, "total"), "plan_change_seen_pct")).isEqualByComparingTo("37.5");
    }

    @Test
    void anAccountMadeAfterTheReportOrBeyondTheWeeksShownCountsForNothing() throws Exception {
        // late (after) and old (July) are busy in the fixture and are in no number at the default eight weeks; cut to two weeks
        // back from the report's week, the older sign-up week (2025-09-29) goes too.
        List<Map<String, Object>> rows = report(AS_OF, Map.of("keel.cohort_weeks", "2"));

        assertThat(rows).extracting(row -> row.get("cohort")).containsExactly("2025-10-13", "total");
        assertThat(row(rows, "total")).containsEntry("started", 3L);
    }

    @Test
    void withNoAccountsInTheWindowTheTotalIsZerosAndTheSharesAreEmptyNotZero() throws Exception {
        List<Map<String, Object>> rows = report("2020-01-01 00:00+00", Map.of());

        assertThat(rows).hasSize(1);
        assertThat(rows.getFirst()).containsEntry("cohort", "total").containsEntry("started", 0L).containsEntry("first_call_reached", 0L)
                .containsEntry("first_call_median_days", null).containsEntry("week_2_retention_pct", null)
                .containsEntry("plan_change_seen_pct", null);
    }

    @Test
    void unsetSettingsMeanNowSevenDaysAndEightWeeks() throws Exception {
        // No keel.* setting at all: the report still runs. The synthetic accounts are long past the eight weeks shown.
        List<Map<String, Object>> rows = report(null, Map.of());

        assertThat(rows).isNotEmpty();
        assertThat(rows.getLast()).containsEntry("cohort", "total");
        assertThat(rows.getFirst().keySet()).containsExactlyElementsOf(COLUMNS);
    }

    @Test
    void theReportWritesNothing() throws Exception {
        // A read-only transaction refuses any write; the report is a single select and still runs.
        try (Connection connection = dataSource.getConnection()) {
            connection.setReadOnly(true);
            try (Statement statement = connection.createStatement()) {
                statement.execute("set keel.report_as_of = '" + AS_OF + "'");
                assertThat(statement.execute(Files.readString(REPORT))).isTrue();
            } finally {
                connection.setReadOnly(false);
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
