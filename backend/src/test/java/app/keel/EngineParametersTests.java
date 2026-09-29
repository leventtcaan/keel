package app.keel;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.ParameterSet;
import app.keel.engine.RepositoryParameters;
import app.keel.persistence.PostgresTestConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

/**
 * The running application reads the same engine parameters as the repository holds (ADR-026): data/parameters is
 * packaged on the classpath and loaded once, so a call made by the server uses exactly the reviewed thresholds.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Import(PostgresTestConfiguration.class)
class EngineParametersTests {

    @Autowired
    ParameterSet parameters;

    @Test
    void theServerLoadsTheRepositorysParameters() {
        assertThat(parameters.versionHash()).isEqualTo(RepositoryParameters.versionHash());
    }
}
