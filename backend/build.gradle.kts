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

    testImplementation(libs.spring.boot.starter.test)
    testImplementation(libs.spring.modulith.starter.test)
    testImplementation(libs.snakeyaml)
    testRuntimeOnly(libs.junit.platform.launcher)
}

// ADR-009: specification tests written before their task starts carry @Tag("pending").
// `test` (and therefore `build` and CI) excludes them; `pendingTest` runs only them.
tasks.test {
    useJUnitPlatform {
        excludeTags("pending")
    }
}

val pendingTest by tasks.registering(Test::class) {
    description = "Runs specification tests whose implementation task has not started yet (ADR-009)."
    group = "verification"
    testClassesDirs = sourceSets.test.get().output.classesDirs
    classpath = sourceSets.test.get().runtimeClasspath
    useJUnitPlatform {
        includeTags("pending")
    }
    shouldRunAfter(tasks.test)
}
