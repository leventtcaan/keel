package app.keel.architecture;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.Action;
import app.keel.engine.ActionType;
import app.keel.engine.Confidence;
import app.keel.engine.Decision;
import app.keel.engine.Phase;
import app.keel.engine.SourceTag;
import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.RecordComponent;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

/**
 * The API contract (contracts/openapi.yaml, K-201, ADR-024) keeps the project's rules: the Decision the app receives is
 * the engine's Decision field for field (U3), every calorie estimate is a range (U5), no body-fat number exists (U4),
 * and every operation is named, answers errors with the shared model and, outside sign-in, needs a session.
 */
class ContractTests {

    // Gradle runs tests with the project directory (backend/) as the working directory.
    private static final Path CONTRACT = Path.of("../contracts/openapi.yaml");
    private static final Set<String> METHODS = Set.of("get", "put", "post", "delete", "patch");
    // Calorie numbers that are a plan or a step, not an estimate: one number the user follows (ADR-020 L-13).
    private static final Set<String> PLAN_NUMBERS = Set.of("targetKcal", "kcalPerDay");
    private static final Pattern FAT_NUMBER = Pattern.compile("(?i)body.?fat|fat.?(pct|percent|proxy|ratio)|fat_?mass");

    @Test
    void everyActionOfTheEngineIsAVariantOfTheContractsActionWithTheSameFields() throws IOException {
        Map<String, Object> schemas = schemas();
        Map<String, Object> action = map(schemas.get("Action"));
        Map<String, Object> mapping = map(map(action.get("discriminator")).get("mapping"));

        assertThat(map(action.get("discriminator")).get("propertyName")).isEqualTo("type");
        assertThat(mapping.keySet()).containsExactlyInAnyOrderElementsOf(Stream.of(ActionType.values()).map(Enum::name).toList());
        for (Class<?> kind : Action.class.getPermittedSubclasses()) {
            String name = actionTypeOf(kind);
            String ref = (String) mapping.get(name);
            Map<String, Object> variant = map(schemas.get(ref.substring(ref.lastIndexOf('/') + 1)));
            List<String> engineFields = Arrays.stream(kind.getRecordComponents()).map(RecordComponent::getName).toList();

            assertThat(properties(variant).keySet()).as(name).containsExactlyInAnyOrderElementsOf(concat("type", engineFields));
            assertThat(list(variant.get("required"))).as(name).containsExactlyInAnyOrderElementsOf(concat("type", engineFields));
        }
    }

    @Test
    void theDecisionCarriesEveryFieldOfTheEnginesDecision() throws IOException {
        Map<String, Object> decision = map(schemas().get("Decision"));
        List<String> engineFields = Arrays.stream(Decision.class.getRecordComponents()).map(RecordComponent::getName).toList();

        assertThat(properties(decision).keySet()).containsAll(engineFields);
        assertThat(list(decision.get("required"))).containsAll(engineFields);
    }

    @Test
    void theEnumsAreTheEnginesEnums() throws IOException {
        Map<String, Object> schemas = schemas();

        assertThat(list(map(schemas.get("Confidence")).get("enum"))).containsExactlyElementsOf(names(Confidence.values()));
        assertThat(list(map(schemas.get("SourceTag")).get("enum"))).containsExactlyElementsOf(names(SourceTag.values()));
        assertThat(list(map(schemas.get("Phase")).get("enum"))).containsExactlyElementsOf(names(Phase.values()));
    }

    @Test
    void everyCalorieEstimateIsARange() throws IOException {
        // U5: a property named kcal is a KcalRange; any other calorie property is one of the plan numbers.
        List<String> problems = new ArrayList<>();
        schemas().forEach((schema, body) -> properties(map(body)).forEach((property, definition) -> {
            boolean calorie = property.toLowerCase(Locale.ROOT).contains("kcal");
            boolean range = "#/components/schemas/KcalRange".equals(map(definition).get("$ref"));
            if (calorie && !range && !PLAN_NUMBERS.contains(property)) {
                problems.add(schema + "." + property);
            }
        }));

        assertThat(problems).isEmpty();
        assertThat(properties(map(schemas().get("KcalRange"))).keySet()).containsExactlyInAnyOrder("low", "high");
    }

    @Test
    void thereIsNoBodyFatNumberAnywhere() throws IOException {
        // U4: the fat estimate stays inside the engine; no name, enum value or description in the contract carries it.
        List<String> hits = new ArrayList<>();
        for (String line : Files.readAllLines(CONTRACT)) {
            if (FAT_NUMBER.matcher(line).find()) {
                hits.add(line.strip());
            }
        }

        assertThat(hits).isEmpty();
    }

    @Test
    void everyOperationIsNamedAnswersErrorsAndOutsideSignInNeedsASession() throws IOException {
        Map<String, Object> contract = contract();
        assertThat(contract.get("security")).as("a session is the default").isEqualTo(List.of(Map.of("session", List.of())));
        List<String> problems = new ArrayList<>();
        Set<String> operationIds = new TreeSet<>();
        map(contract.get("paths")).forEach((path, item) -> map(item).forEach((method, body) -> {
            if (!METHODS.contains(method)) {
                return;
            }
            Map<String, Object> operation = map(body);
            String where = method.toUpperCase(Locale.ROOT) + " " + path;
            if (!(operation.get("operationId") instanceof String id) || !operationIds.add(id)) {
                problems.add(where + ": missing or repeated operationId");
            }
            if (!map(operation.get("responses")).containsKey("default")) {
                problems.add(where + ": no default error response");
            }
            boolean open = path.equals("/health") || path.startsWith("/v1/auth/");
            if (open != List.of().equals(operation.get("security"))) {
                problems.add(where + (open ? ": sign-in must not need a session" : ": must not turn the session off"));
            }
            if (!open && !path.startsWith("/v1/")) {
                problems.add(where + ": not under /v1");
            }
        }));

        assertThat(problems).isEmpty();
        assertThat(operationIds).hasSizeGreaterThan(1);
    }

    @Test
    void theAcceptedResourcesAreAllThere() throws IOException {
        // K-201: auth, profile, consent, measurements, meals, workouts, check-in, decisions, coach.
        Set<String> paths = map(contract().get("paths")).keySet();

        assertThat(paths).anyMatch(p -> p.startsWith("/v1/auth/"));
        for (String resource : List.of("/v1/profile", "/v1/consents", "/v1/weigh-ins", "/v1/waist-measurements", "/v1/meals",
                "/v1/workouts", "/v1/check-ins", "/v1/decisions", "/v1/coach/messages")) {
            assertThat(paths).as(resource).anyMatch(p -> p.startsWith(resource));
        }
    }

    // ── reading the contract ────────────────────────────────────────────────────────────────────────────────

    private static Map<String, Object> contract() throws IOException {
        try (InputStream in = Files.newInputStream(CONTRACT)) {
            return new Yaml().load(in);
        }
    }

    private static Map<String, Object> schemas() throws IOException {
        return map(map(contract().get("components")).get("schemas"));
    }

    private static Map<String, Object> properties(Map<String, Object> schema) {
        return schema.get("properties") == null ? Map.of() : map(schema.get("properties"));
    }

    private static String actionTypeOf(Class<?> kind) {
        // The record's simple name in UPPER_SNAKE is its ActionType (Action#type() maps them one to one).
        return kind.getSimpleName().replaceAll("([a-z])([A-Z])", "$1_$2").toUpperCase(Locale.ROOT);
    }

    private static List<String> concat(String first, List<String> rest) {
        List<String> all = new ArrayList<>(List.of(first));
        all.addAll(rest);
        return all;
    }

    private static List<String> names(Enum<?>[] values) {
        return Stream.of(values).map(Enum::name).toList();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(Object value) {
        return value instanceof Map<?, ?> m ? (Map<String, Object>) m : Map.of();
    }

    @SuppressWarnings("unchecked")
    private static List<Object> list(Object value) {
        return value instanceof List<?> l ? (List<Object>) l : List.of();
    }
}
