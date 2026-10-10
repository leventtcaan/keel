package app.keel.decision;

import app.keel.engine.ParameterDomain;
import app.keel.engine.ParameterSet;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;
import org.yaml.snakeyaml.Yaml;

/** The repository's real parameter files (data/parameters), as the engine reads them, for tests of the decision module. */
final class RepositoryParameters {

    private RepositoryParameters() {
    }

    static ParameterSet set() {
        Map<String, Object> documents = new HashMap<>();
        for (ParameterDomain domain : ParameterDomain.values()) {
            try (InputStream in = new ClassPathResource("data/parameters/" + domain.fileName()).getInputStream()) {
                documents.put(domain.fileName(), new Yaml().load(in));
            } catch (IOException e) {
                throw new IllegalStateException(domain.fileName(), e);
            }
        }
        return ParameterSet.fromDocuments(documents);
    }
}
