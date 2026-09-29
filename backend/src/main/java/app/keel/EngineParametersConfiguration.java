package app.keel;

import app.keel.engine.ParameterDomain;
import app.keel.engine.ParameterSet;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;

/**
 * The engine's parameters for the running application (ADR-026): data/parameters/<domain>.yaml, packaged on the classpath,
 * read once into the engine's ParameterSet, which checks every key, unit and source as the tests do. Outside every
 * module, so the engine stays free of Spring (ADR-003) and every module gets the same set.
 */
@Configuration(proxyBeanMethods = false)
class EngineParametersConfiguration {

    private static final String FOLDER = "data/parameters/";

    @Bean
    ParameterSet engineParameters() throws IOException {
        // Duplicate keys refused, as in the tests: a parameter written twice would silently keep one of the two.
        LoaderOptions strict = new LoaderOptions();
        strict.setAllowDuplicateKeys(false);
        // One file per engine domain, as the tests read them; other files there (quota.yaml) are not the engine's.
        Map<String, Object> documents = new HashMap<>();
        for (ParameterDomain domain : ParameterDomain.values()) {
            try (InputStream in = new ClassPathResource(FOLDER + domain.fileName()).getInputStream()) {
                documents.put(domain.fileName(), new Yaml(strict).load(in));
            }
        }
        return ParameterSet.fromDocuments(documents);
    }
}
