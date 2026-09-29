package app.keel.persistence;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * A real PostgreSQL for integration tests (ADR-020: Testcontainers, the same as CI). The image is the one compose.yaml
 * runs, named once in gradle/libs.versions.toml and passed in by build.gradle.kts; @ServiceConnection points the
 * application's DataSource at the container.
 */
@TestConfiguration(proxyBeanMethods = false)
public class PostgresTestConfiguration {

    static final String IMAGE_PROPERTY = "keel.postgres.image";

    @Bean
    @ServiceConnection
    PostgreSQLContainer postgres() {
        return new PostgreSQLContainer(System.getProperty(IMAGE_PROPERTY));
    }
}
