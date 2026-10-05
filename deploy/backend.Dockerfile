# The server's image (K-901, ADR-065). Built from the repository root: the backend copies ../data/* into its jar
# (backend/build.gradle.kts › processResources). Tests run in CI before an image is built (K-902), not here.
# Images by version and digest (K6); the Java release is the version catalog's (libs.versions.toml › java).
FROM eclipse-temurin:25.0.4.1_1-jdk-noble@sha256:589ff4cc3f71aab462e7048a47a0d10edf57fbccde3fceea2281e610bf5880b4 AS build
WORKDIR /src
COPY data ./data
COPY backend ./backend
WORKDIR /src/backend
RUN ./gradlew bootJar --no-daemon --console=plain && cp build/libs/*.jar /keel.jar

FROM eclipse-temurin:25.0.4.1_1-jre-noble@sha256:d9a39a23634650173f1e2bbc176227af9728587ecf0f4b62d53e9355cd7a19ab
# Never root: a fixed id the host can match for nothing — the container writes no files of its own.
RUN useradd --system --uid 10001 --no-create-home keel
COPY --from=build /keel.jar /app/keel.jar
USER keel
EXPOSE 8080
# The JVM sizes its heap from the container's memory limit (compose.yaml), not the host's.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/keel.jar"]
