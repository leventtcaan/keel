package app.keel.privacy;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * Deletion and export against what the product says it keeps (K-802, V6): the data inventory the privacy policy is
 * written from (docs/yasal/veri-envanteri.json, ADR-060). Every table it says goes with the account is filled, the
 * account is deleted through the API, and once the second pass has run the account's id — and Apple's id for the
 * person — is in no table of the database, not in a column of its own, not inside a stored event; neither of its tokens
 * works. Every table it says is exported is filled in the export, at the place its export_key names.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class EndToEndDeletionTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final Path INVENTORY = Path.of("../docs/yasal/veri-envanteri.json");
    private static final Duration PATIENCE = Duration.ofSeconds(10);

    /** One server table of the inventory. */
    record Table(String table, String module, List<String> columns, List<String> erasedBy, boolean exported, String exportKey) {

        boolean goesWithTheAccount() {
            return erasedBy.contains("account_deletion");
        }

        /** The column that names the account: account_id, or the account table's own id. */
        String accountColumn() {
            return columns.contains("account_id") ? "account_id" : "id";
        }
    }

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    @Test
    void afterTheDeletionTheAccountIsInNoTableAndNoTokenOfItWorks() throws Exception {
        AccountId account = new AccountFixture(mvc, context, jdbc).withDataEverywhere();
        AccountId bystander = new AccountFixture(mvc, context, jdbc).withDataEverywhere();
        String access = TestSessions.bearer(context, account);
        String refresh = TestSessions.refreshToken(context, account);
        // Apple's id for the person names them better than the random account id: it goes too.
        String appleSubject = jdbc.sql("select apple_subject from identity.account where id = :account").param("account", account.value())
                .query(String.class).single();
        assertThat(mvc.post().uri("/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(Map.of("refreshToken", refresh))).exchange()).as("the refresh token works before").hasStatusOk();
        refresh = TestSessions.refreshToken(context, account);
        assertThat(rowsIn(account, erasedWithTheAccount())).as("the test fills every table the inventory erases with the account")
                .allSatisfy((table, rows) -> assertThat(rows).as(table).isPositive());

        assertThat(mvc.delete().uri("/v1/account").header("Authorization", access).exchange()).hasStatus(202);
        awaitNoRowsOf(account);
        // The second pass (DeletionSweep), as the scheduler runs it once its time has come.
        jdbc.sql("update privacy.deletion set requested_at = now() - interval '1 day' where deleted_account_id = :account")
                .param("account", account.value()).update();
        context.getBean(DeletionSweep.class).scheduled();

        awaitNowhere(account.value().toString());
        assertThat(mentionsOf(appleSubject)).as("the Apple id is still in").isEmpty();
        assertThat(mvc.get().uri("/v1/profile").header("Authorization", access).exchange()).hasStatus(401);
        assertThat(mvc.post().uri("/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(Map.of("refreshToken", refresh))).exchange()).hasStatus(401);
        assertThat(rowsIn(bystander, erasedWithTheAccount())).as("another account keeps everything")
                .allSatisfy((table, rows) -> assertThat(rows).as(table).isPositive());
    }

    @Test
    void theExportHoldsEveryTableTheInventorySaysIsExported() throws Exception {
        AccountId account = new AccountFixture(mvc, context, jdbc).withDataEverywhere();

        MvcTestResult result = mvc.get().uri("/v1/account/export").header("Authorization", TestSessions.bearer(context, account)).exchange();

        assertThat(result).hasStatusOk();
        Map<String, Object> sections = (Map<String, Object>) JSON.readValue(result.getResponse().getContentAsString(), Map.class).get("sections");
        List<String> exported = inventory().stream().filter(Table::exported).map(Table::module).distinct().toList();
        assertThat(exported).as("the inventory exports something").isNotEmpty();
        assertThat(exported).allSatisfy(module -> assertThat((Map<String, Object>) sections.get(module)).as(module).isNotEmpty());
        // And the other way: a section the inventory does not know is data the policy does not mention.
        assertThat(exported).containsAll(sections.keySet());
        // Each table, where its rows are: a table dropped from a section, or a list left empty, is data held and not handed out.
        assertThat(inventory().stream().filter(Table::exported)).allSatisfy(table ->
                assertThat(filled(sections.get(table.module()), List.of(table.exportKey().split("\\.")))).as(table.table() + " at " + table.exportKey())
                        .isTrue());
    }

    private List<Table> inventory() throws Exception {
        Map<String, Object> file = JSON.readValue(Files.readString(INVENTORY), Map.class);
        return ((List<Map<String, Object>>) file.get("server")).stream()
                .map(entry -> new Table((String) entry.get("table"), (String) entry.get("module"), (List<String>) entry.get("columns"),
                        (List<String>) entry.get("erased_by"), (Boolean) entry.get("exported"), (String) entry.get("export_key")))
                .toList();
    }

    private List<Table> erasedWithTheAccount() throws Exception {
        List<Table> tables = inventory().stream().filter(Table::goesWithTheAccount).toList();
        assertThat(tables).as("the inventory erases something with the account").isNotEmpty();
        return tables;
    }

    /** Rows per table naming the account in its account column. */
    private Map<String, Integer> rowsIn(AccountId account, List<Table> tables) {
        Map<String, Integer> rows = new TreeMap<>();
        for (Table table : tables) {
            rows.put(table.table(), jdbc.sql("select count(*) from " + table.table() + " where " + table.accountColumn() + " = :account")
                    .param("account", account.value()).query(Integer.class).single());
        }
        return rows;
    }

    /** Whether the path (keys, "name[]" for every element of a list) leads to a value that holds something. */
    private static boolean filled(Object value, List<String> path) {
        if (path.isEmpty()) {
            return value instanceof Collection<?> list ? !list.isEmpty() : value instanceof Map<?, ?> map ? !map.isEmpty()
                    : value != null && !value.toString().isBlank();
        }
        String step = path.getFirst();
        boolean each = step.endsWith("[]");
        Object next = value instanceof Map<?, ?> map ? map.get(each ? step.substring(0, step.length() - 2) : step) : null;
        if (!each) {
            return filled(next, path.subList(1, path.size()));
        }
        return next instanceof Collection<?> list && list.stream().anyMatch(element -> filled(element, path.subList(1, path.size())));
    }

    /**
     * Rows per table.column holding the text anywhere in it — as a column's own value, inside a stored event, in an array —
     * over every table of the database, listed in the inventory or not (a table missing from it fails the inventory's test).
     */
    private Map<String, Integer> mentionsOf(String text) {
        List<Map<String, Object>> columns = jdbc.sql("""
                select c.table_schema || '.' || c.table_name as tab, c.column_name as col from information_schema.columns c
                join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
                where t.table_type = 'BASE TABLE' and c.table_schema not in ('pg_catalog', 'information_schema')
                order by 1, 2""").query().listOfRows();
        Map<String, Integer> mentions = new TreeMap<>();
        for (Map<String, Object> column : columns) {
            String name = column.get("tab") + "." + column.get("col");
            int rows = jdbc.sql("select count(*) from " + column.get("tab") + " where \"" + column.get("col") + "\"::text like '%' || :text || '%'")
                    .param("text", text).query(Integer.class).single();
            if (rows > 0) {
                mentions.put(name, rows);
            }
        }
        return mentions;
    }

    private void awaitNoRowsOf(AccountId account) throws Exception {
        Instant deadline = Instant.now().plus(PATIENCE);
        Map<String, Integer> left = rowsIn(account, erasedWithTheAccount());
        while (left.values().stream().anyMatch(rows -> rows > 0) && Instant.now().isBefore(deadline)) {
            Thread.sleep(100);
            left = rowsIn(account, erasedWithTheAccount());
        }
        assertThat(left).as("rows left after the deletion").allSatisfy((table, rows) -> assertThat(rows).as(table).isZero());
    }

    /** Until the second pass has run, its own record (privacy.deletion) names the account: that one is waited out last. */
    private void awaitNowhere(String id) throws Exception {
        Instant deadline = Instant.now().plus(PATIENCE);
        Map<String, Integer> left = mentionsOf(id);
        while (!left.isEmpty() && Instant.now().isBefore(deadline)) {
            Thread.sleep(100);
            left = mentionsOf(id);
        }
        assertThat(left).as("the deleted account's id is still in").isEmpty();
    }
}
