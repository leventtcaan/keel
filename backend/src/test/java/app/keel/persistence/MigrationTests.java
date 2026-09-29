package app.keel.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * The application migrates a real PostgreSQL when it starts (K-202, ADR-005): every migration file is applied, none is
 * pending, and the tables the framework needs come from a migration, not from the framework creating them itself.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Import(PostgresTestConfiguration.class)
class MigrationTests {

    @Autowired
    Flyway flyway;

    @Autowired
    JdbcClient jdbc;

    @Test
    void everyMigrationFileIsAppliedWhenTheApplicationStarts() throws IOException {
        long files;
        try (Stream<Path> migrations = Files.list(MigrationConventions.DIRECTORY)) {
            files = migrations.filter(file -> file.toString().endsWith(".sql")).count();
        }

        assertThat(files).isPositive();
        assertThat(flyway.info().applied()).hasSize((int) files).allMatch(info -> info.getState().isApplied());
        assertThat(flyway.info().pending()).isEmpty();
    }

    @Test
    void theEventRegistryTableComesFromTheFirstMigration() {
        // Modulith keeps each module event until its listeners finish (account deletion, K-214); its table is ours.
        assertThat(flyway.info().applied()).extracting(MigrationInfo::getScript).first()
                .isEqualTo("V1__modulith_event_publication.sql");
        assertThat(jdbc.sql("""
                select column_name from information_schema.columns
                where table_schema = 'public' and table_name = 'event_publication'""").query(String.class).set())
                .containsExactlyInAnyOrder("id", "listener_id", "event_type", "serialized_event", "publication_date",
                        "completion_date", "status", "completion_attempts", "last_resubmission_date");
    }

    @Test
    void afterMigratingNoTableOrViewReachesIntoAnotherSchema() {
        // The database's own catalog is the boundary check the file rule (MigrationConventions) only approximates.
        assertThat(ModuleBoundary.crossings(jdbc)).isEmpty();
        assertThat(ModuleBoundary.publicTables(jdbc)).containsExactlyInAnyOrder("event_publication", "flyway_schema_history");
    }

    @Test
    void theBoundaryCheckSeesAForeignKeyAndAViewAcrossSchemas() {
        jdbc.sql("create schema boundary_a").update();
        jdbc.sql("create schema boundary_b").update();
        try {
            jdbc.sql("create table boundary_a.account (id int primary key)").update();
            jdbc.sql("create table boundary_b.goal (account_id int references boundary_a.account (id))").update();
            jdbc.sql("create view boundary_b.accounts as select id from boundary_a.account").update();

            assertThat(ModuleBoundary.crossings(jdbc)).containsExactlyInAnyOrder(
                    "foreign key boundary_b.goal -> boundary_a.account", "view boundary_b.accounts reads boundary_a.account");
        } finally {
            jdbc.sql("drop schema boundary_b cascade").update();
            jdbc.sql("drop schema boundary_a cascade").update();
        }
    }
}
