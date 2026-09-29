plugins {
    java
    alias(libs.plugins.spring.boot)
}

group = "app.keel"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(libs.versions.java.get())
    }
}

repositories {
    mavenCentral()
}

dependencies {
    // BOMs pin every transitive version; nothing below declares its own.
    implementation(platform(libs.spring.boot.bom))
    implementation(platform(libs.spring.modulith.bom))

    implementation(libs.spring.boot.starter)
    implementation(libs.spring.modulith.starter.core)
    // Persistence (ADR-005, ADR-023): Spring Data JDBC, Flyway migrations, the PostgreSQL driver, and Modulith's
    // event publication registry on the same database (its table comes from a migration, not auto-created).
    // The HTTP API (ADR-024) and its shared error model and request log (K-215).
    implementation(libs.spring.boot.starter.webmvc)
    // Sign in with Apple and our own session tokens (K-203, ADR-011).
    implementation(libs.spring.boot.starter.security)
    implementation(libs.spring.boot.starter.oauth2.resource.server)
    implementation(libs.spring.boot.starter.data.jdbc)
    implementation(libs.spring.boot.starter.flyway)
    implementation(libs.spring.modulith.starter.jdbc)
    runtimeOnly(libs.flyway.database.postgresql)
    runtimeOnly(libs.postgresql)

    testImplementation(libs.spring.boot.starter.test)
    testImplementation(libs.spring.modulith.starter.test)
    testImplementation(libs.snakeyaml)
    // Engine purity rules (ADR-003). Version from the Spring Modulith BOM, which already uses ArchUnit.
    testImplementation(libs.archunit)
    // Property-based tests for pure engine functions (skill property-based-testing, K-103).
    testImplementation(libs.jqwik)
    // Integration tests run against a real PostgreSQL in a container, the same image as docker compose (ADR-020).
    testImplementation(libs.spring.boot.starter.webmvc.test)
    testImplementation(libs.spring.boot.starter.security.test)
    testImplementation(libs.spring.boot.testcontainers)
    testImplementation(libs.testcontainers.postgresql)
    testImplementation(libs.testcontainers.junit.jupiter)
    testRuntimeOnly(libs.junit.platform.launcher)
}

// The engine's parameters ship with the application (ADR-026): data/parameters/*.yaml on the classpath under
// data/parameters/, loaded once by EngineParametersConfiguration. The repository files stay the only source.
tasks.processResources {
    from("../data/parameters") {
        into("data/parameters")
    }
    // The exercise catalog (K-210): one move per file, loaded and checked by the training module.
    from("../data/exercises") {
        into("data/exercises")
    }
    // The program templates (K-211), checked against the catalog as they load.
    from("../data/programs") {
        into("data/programs")
    }
    // Its two closed vocabularies: muscles (with regions) and setup fields (K-219).
    from(files("../data/muscles.yaml", "../data/exercise-setup.yaml")) {
        into("data")
    }
}

// Integration tests start the same PostgreSQL image as compose.yaml, named once in the version catalog (K-202).
tasks.withType<Test>().configureEach {
    systemProperty("keel.postgres.image", "postgres:${libs.versions.postgres.image.get()}")
    // Tests read the repository's own files (parameters, catalog, copy, contract, research anchors, app assets). Declared
    // as inputs so a change there reruns them: otherwise Gradle calls the tests up to date after a data-only change.
    inputs.dir("../data").withPropertyName("repositoryData").withPathSensitivity(PathSensitivity.RELATIVE)
    inputs.file("../contracts/openapi.yaml").withPropertyName("contract").withPathSensitivity(PathSensitivity.RELATIVE)
    inputs.dir("../arastirma").withPropertyName("research").withPathSensitivity(PathSensitivity.RELATIVE)
    inputs.dir("../apps/mobile/assets").withPropertyName("appAssets").withPathSensitivity(PathSensitivity.RELATIVE)
}

// ADR-009: specification tests written before their task starts carry @Tag("pending").
// `test` (and therefore `build` and CI) excludes them; `pendingTest` runs only them.
tasks.test {
    useJUnitPlatform {
        excludeTags("pending")
    }
}

tasks.register<Test>("pendingTest") {
    description = "Runs specification tests whose implementation task has not started yet (ADR-009)."
    group = "verification"
    testClassesDirs = sourceSets.test.get().output.classesDirs
    classpath = sourceSets.test.get().runtimeClasspath
    useJUnitPlatform {
        includeTags("pending")
    }
    shouldRunAfter(tasks.test)
}
