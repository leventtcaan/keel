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
    testImplementation(libs.spring.boot.testcontainers)
    testImplementation(libs.testcontainers.postgresql)
    testImplementation(libs.testcontainers.junit.jupiter)
    testRuntimeOnly(libs.junit.platform.launcher)
}

// Integration tests start the same PostgreSQL image as compose.yaml, named once in the version catalog (K-202).
tasks.withType<Test>().configureEach {
    systemProperty("keel.postgres.image", "postgres:${libs.versions.postgres.image.get()}")
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
