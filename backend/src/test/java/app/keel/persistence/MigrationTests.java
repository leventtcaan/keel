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
    void theServerIsTheCatalogsPostgresRelease() {
        String release = System.getProperty(PostgresTestConfiguration.IMAGE_PROPERTY).substring("postgres:".length());

        assertThat(jdbc.sql("show server_version").query(String.class).single()).startsWith(release);
    }
}
