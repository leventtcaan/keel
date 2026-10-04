package app.keel.privacy;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
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
 * account is deleted through the API, and then the account's id is in no table the inventory lists — not in a column of
 * its own, not inside a stored event — and neither of its tokens works. Every table it says is exported has its
 * module's section in the export.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class EndToEndDeletionTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final Path INVENTORY = Path.of("../docs/yasal/veri-envanteri.json");
    private static final Duration PATIENCE = Duration.ofSeconds(10);

    /** One server table of the inventory. */
    record Table(String table, String module, List<String> columns, List<String> erasedBy, boolean exported) {

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
    void afterTheDeletionTheAccountIsInNoTableTheInventoryListsAndNoTokenOfItWorks() throws Exception {
        AccountId account = new AccountFixture(mvc, context, jdbc).withDataEverywhere();
        AccountId bystander = new AccountFixture(mvc, context, jdbc).withDataEverywhere();
        String access = TestSessions.bearer(context, account);
        String refresh = TestSessions.refreshToken(context, account);
        assertThat(rowsIn(account, erasedWithTheAccount())).as("the test fills every table the inventory erases with the account")
                .allSatisfy((table, rows) -> assertThat(rows).as(table).isPositive());

        assertThat(mvc.delete().uri("/v1/account").header("Authorization", access).exchange()).hasStatus(202);
        awaitNoRowsOf(account);
        // The second pass (DeletionSweep), as the scheduler runs it once its time has come.
        jdbc.sql("update privacy.deletion set requested_at = now() - interval '1 day' where deleted_account_id = :account")
                .param("account", account.value()).update();
        context.getBean(DeletionSweep.class).scheduled();

        awaitNowhere(account);
        assertThat(mvc.get().uri("/v1/profile").header("Authorization", access).exchange()).hasStatus(401);
        assertThat(mvc.post().uri("/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(Map.of("refreshToken", refresh))).exchange()).hasStatus(401);
        assertThat(rowsIn(bystander, erasedWithTheAccount())).as("another account keeps everything")
                .allSatisfy((table, rows) -> assertThat(rows).as(table).isPositive());
    }

    @Test
    void theExportHasTheSectionOfEveryModuleTheInventorySaysIsExported() throws Exception {
        AccountId account = new AccountFixture(mvc, context, jdbc).withDataEverywhere();

        MvcTestResult result = mvc.get().uri("/v1/account/export").header("Authorization", TestSessions.bearer(context, account)).exchange();

        assertThat(result).hasStatusOk();
        Map<String, Object> sections = (Map<String, Object>) JSON.readValue(result.getResponse().getContentAsString(), Map.class).get("sections");
        List<String> exported = inventory().stream().filter(Table::exported).map(Table::module).distinct().toList();
        assertThat(exported).as("the inventory exports something").isNotEmpty();
        assertThat(exported).allSatisfy(module -> assertThat((Map<String, Object>) sections.get(module)).as(module).isNotEmpty());
        // And the other way: a section the inventory does not know is data the policy does not mention.
        assertThat(exported).containsAll(sections.keySet());
    }

    private List<Table> inventory() throws Exception {
        Map<String, Object> file = JSON.readValue(Files.readString(INVENTORY), Map.class);
        return ((List<Map<String, Object>>) file.get("server")).stream()
                .map(entry -> new Table((String) entry.get("table"), (String) entry.get("module"), (List<String>) entry.get("columns"),
                        (List<String>) entry.get("erased_by"), (Boolean) entry.get("exported")))
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

    /**
     * Rows per table.column holding the account's id anywhere in it — as its own value, or inside a text such as a stored
     * event — over every table the inventory lists, whatever it says erases them.
     */
    private Map<String, Integer> mentionsOf(AccountId account) throws Exception {
        Map<String, Integer> mentions = new TreeMap<>();
        for (Table table : inventory()) {
            String[] name = table.table().split("\\.");
            List<String> columns = jdbc.sql("""
                    select column_name from information_schema.columns
                    where table_schema = :schema and table_name = :table and data_type in ('uuid', 'text', 'character varying', 'jsonb')
                    order by ordinal_position""").param("schema", name[0]).param("table", name[1]).query(String.class).list();
            for (String column : columns) {
                int rows = jdbc.sql("select count(*) from " + table.table() + " where " + column + "::text like '%' || :id || '%'")
                        .param("id", account.value().toString()).query(Integer.class).single();
                if (rows > 0) {
                    mentions.put(table.table() + "." + column, rows);
                }
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
    private void awaitNowhere(AccountId account) throws Exception {
        Instant deadline = Instant.now().plus(PATIENCE);
        Map<String, Integer> left = mentionsOf(account);
        while (!left.isEmpty() && Instant.now().isBefore(deadline)) {
            Thread.sleep(100);
            left = mentionsOf(account);
        }
        assertThat(left).as("the deleted account's id is still in").isEmpty();
    }
}
