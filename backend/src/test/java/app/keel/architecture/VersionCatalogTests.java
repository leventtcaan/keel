package app.keel.architecture;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/** Every version lives in gradle/libs.versions.toml; the build script must not declare its own (K6, ADR-001). */
class VersionCatalogTests {

    // "group:artifact:1.2.3" coordinates, or version "..." / version = "..." declarations.
    private static final Pattern INLINE_VERSION =
            Pattern.compile("\"[\\w.-]+:[\\w.-]+:[\\w.-]+\"|\\bversion\\s*=?\\s*\"");

    @Test
    void buildScriptHasNoInlineVersions() throws IOException {
        // Gradle runs tests with the project directory (backend/) as the working directory.
        String buildScript = Files.readString(Path.of("build.gradle.kts"));

        assertThat(INLINE_VERSION.matcher(buildScript).find())
                .as("build.gradle.kts must take versions from gradle/libs.versions.toml")
                .isFalse();
    }
}
