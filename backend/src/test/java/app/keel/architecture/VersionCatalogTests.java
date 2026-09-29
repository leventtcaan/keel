package app.keel.architecture;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/** Every version lives in gradle/libs.versions.toml; the build script must not declare its own (K6, ADR-001). */
class VersionCatalogTests {

    // "group:artifact:1.2.3" coordinates, or version "..." / version = "..." declarations.
    private static final Pattern INLINE_VERSION =
            Pattern.compile("\"[\\w.-]+:[\\w.-]+:[\\w.-]+\"|\\bversion\\s*=?\\s*\"");

    @Test
    void composeRunsTheCatalogsPostgresImage() throws IOException {
        // The PostgreSQL release is named once (libs.versions.toml › postgres-image); compose.yaml cannot read the
        // catalog, so it is checked against it. Testcontainers gets it from build.gradle.kts (keel.postgres.image).
        Matcher release = Pattern.compile("(?m)^postgres-image = \"([^\"]+)\"").matcher(Files.readString(Path.of("gradle/libs.versions.toml")));
        assertThat(release.find()).as("postgres-image in the version catalog").isTrue();

        assertThat(Path.of("compose.yaml")).exists();
        assertThat(Files.readString(Path.of("compose.yaml"))).contains("image: postgres:" + release.group(1) + "\n");
        assertThat(System.getProperty("keel.postgres.image")).isEqualTo("postgres:" + release.group(1));
    }

    @Test
    void buildScriptHasNoInlineVersions() throws IOException {
        // Gradle runs tests with the project directory (backend/) as the working directory.
        String buildScript = Files.readString(Path.of("build.gradle.kts"));

        assertThat(INLINE_VERSION.matcher(buildScript).find())
                .as("build.gradle.kts must take versions from gradle/libs.versions.toml")
                .isFalse();
    }
}
