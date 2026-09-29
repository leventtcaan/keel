package app.keel.architecture;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

/**
 * V5: no key, password or token lives in the repository. Every setting whose name says it is one, in every
 * application*.yml the application ships, is a ${ENVIRONMENT} placeholder (K-203: the session key, Apple's IDs).
 */
class SecretsFromEnvironmentTests {

    private static final Pattern SECRET_NAME = Pattern.compile("(?i)secret|password|token|private|credential|api-?key");
    private static final Pattern PLACEHOLDER = Pattern.compile("\\$\\{[A-Z0-9_]+}");

    @Test
    void everySecretSettingComesFromTheEnvironment() throws IOException {
        List<String> literal = new ArrayList<>();
        try (Stream<Path> files = Files.list(Path.of("src/main/resources"))) {
            for (Path file : files.filter(f -> f.getFileName().toString().matches("application.*\\.ya?ml")).toList()) {
                try (InputStream in = Files.newInputStream(file)) {
                    collect(file.getFileName() + ":", new Yaml().load(in), literal);
                }
            }
        }

        assertThat(literal).isEmpty();
    }

    @Test
    void theCheckSeesANestedLiteralSecret() {
        List<String> literal = new ArrayList<>();
        collect("x:", Map.of("keel", Map.of("session", Map.of("secret", "c2VjcmV0", "access-ttl", "15m"),
                "apple", Map.of("client-id", "${KEEL_APPLE_CLIENT_ID}"))), literal);

        assertThat(literal).containsExactly("x:keel.session.secret");
    }

    @SuppressWarnings("unchecked")
    private static void collect(String where, Object node, List<String> literal) {
        if (node instanceof Map<?, ?> map) {
            ((Map<String, Object>) map).forEach((key, value) -> {
                String here = where.endsWith(":") ? where + key : where + "." + key;
                if (value instanceof Map<?, ?>) {
                    collect(here, value, literal);
                } else if (SECRET_NAME.matcher(key).find() && !(value instanceof String text && PLACEHOLDER.matcher(text).matches())) {
                    literal.add(here);
                }
            });
        }
    }
}
