package app.keel.architecture;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.Action;
import app.keel.engine.ActivityLevel;
import app.keel.engine.ActionType;
import app.keel.engine.Confidence;
import app.keel.engine.Decision;
import app.keel.engine.Phase;
import app.keel.engine.Reason;
import app.keel.engine.Sex;
import app.keel.engine.Source;
import app.keel.engine.SourceTag;
import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.RecordComponent;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.LinkedHashMap;
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
    private static final Set<String> METHODS = Set.of("get", "put", "post", "delete", "patch", "head", "options", "trace");
    // Calorie numbers that are not estimates (U5: "a target and a decision may be one number"): the plan's daily target
    // and a decision's step, and a device's own reading passed through as given.
    private static final Set<String> SINGLE_CALORIE_NUMBERS = Set.of("Targets.targetKcal", "DayBudget.targetKcal",
            "AdjustCalories.kcalPerDay", "IncreaseCalories.kcalPerDay", "ActivityDay.activeEnergyKcal",
            // What an Apple Watch measured during a cardio session (K-959, ADR-074 #5).
            "NewCardioSession.activeEnergyKcal");
    private static final Set<String> RANGES = Set.of("#/components/schemas/KcalRange", "#/components/schemas/KcalBalance");
    private static final Pattern FAT_NUMBER = Pattern.compile(
            "(?i)body.?fat|fat.?(pct|percent|proxy|ratio|free)|fat_?mass|percent.?fat|lean.?mass|\\bffm\\b|body.?composition");

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
            assertThat(map(properties(variant).get("type")).get("const")).as(name + " const").isEqualTo(name);
            for (RecordComponent component : kind.getRecordComponents()) {
                assertThat(typeOf(map(properties(variant).get(component.getName())))).as(name + "." + component.getName())
                        .isEqualTo(jsonTypeOf(component.getType()));
            }
        }
        // The generated TypeScript union is built from oneOf: it must hold exactly the mapped variants.
        assertThat(list(action.get("oneOf")).stream().map(ref -> (String) map(ref).get("$ref")).toList())
                .containsExactlyInAnyOrderElementsOf(mapping.values().stream().map(String.class::cast).toList());
    }

    @Test
    void thePlannedExerciseTheServerSendsIsTheContractsFieldForField() throws Exception {
        // K-960 (ADR-075 #3): the in-session table rides on the program the phone keeps for the gym, offline.
        Map<String, Object> planned = map(schemas().get("PlannedExercise"));
        Class<?> sent = Class.forName("app.keel.training.ProgramController$PlannedExercise");
        Class<?> best = Class.forName("app.keel.training.ProgramController$BestSet");

        assertThat(properties(planned).keySet()).containsExactlyInAnyOrderElementsOf(componentNames(sent));
        assertThat(properties(map(properties(planned).get("lastBestSet"))).keySet()).containsExactlyInAnyOrderElementsOf(componentNames(best));
        assertThat(properties(planned).keySet()).contains("lighterLoadKg", "heavierLoadKg", "lastBestSet", "nextLoadAtTopKg", "calibrationStepKg");
    }

    @Test
    void theProgramReviewIsTheEnginesFindingsAndTheServersRecordsFieldForField() throws Exception {
        // K-956 (ADR-073 #2-#3): the phone shows the review, sends back the picks and the change to undo; the program carries
        // the review, optional for programs from before it.
        Map<String, Object> schemas = schemas();
        Map<String, Object> paths = map(contract().get("paths"));
        Map<String, Object> suggestion = map(schemas.get("ReviewSuggestion"));

        assertThat(map(map(paths.get("/v1/program/review")).get("get")).get("operationId")).isEqualTo("getProgramReview");
        assertThat(map(map(paths.get("/v1/program/review/apply")).get("post")).get("operationId")).isEqualTo("applyProgramReview");
        assertThat(map(map(paths.get("/v1/program/review/undo")).get("post")).get("operationId")).isEqualTo("undoProgramReview");
        assertThat(list(map(properties(suggestion).get("finding")).get("enum")))
                .containsExactlyElementsOf(names(app.keel.engine.ProgramReview.Finding.values()));
        Map<String, String> sent = Map.of("ReviewSuggestion", "app.keel.training.ProgramReviews$Suggestion", "ProgramReview",
                "app.keel.training.ProgramReviews$Review", "AppliedReviewChange", "app.keel.training.ProgramReviews$Applied", "ReviewApply",
                "app.keel.training.ProgramController$ReviewApply", "ReviewUndo", "app.keel.training.ProgramController$ReviewUndo", "ReviewUndone",
                "app.keel.training.ProgramController$ReviewUndone");
        for (Map.Entry<String, String> schema : sent.entrySet()) {
            assertThat(properties(map(schemas.get(schema.getKey()))).keySet()).as(schema.getKey())
                    .containsExactlyInAnyOrderElementsOf(componentNames(Class.forName(schema.getValue())));
        }
        assertThat(map(properties(suggestion).get("reason")).get("$ref")).isEqualTo("#/components/schemas/Reason");
        assertThat(properties(map(schemas.get("Program")))).containsKey("review");
        assertThat(list(map(schemas.get("Program")).get("required"))).doesNotContain("review");
    }

    @Test
    void theProgramsCardioIsTheServersAndTheEnginesFieldForField() throws Exception {
        // K-959 (ADR-074): optional on the program, for the phones that read it before; its places and sources the engine's.
        Map<String, Object> schemas = schemas();
        Map<String, Object> program = map(schemas.get("Program"));

        assertThat(properties(program)).containsKey("cardio");
        assertThat(list(program.get("required"))).doesNotContain("cardio");
        assertThat(properties(map(schemas.get("ProgramCardio"))).keySet())
                .containsExactlyInAnyOrderElementsOf(componentNames(Class.forName("app.keel.training.ProgramController$ProgramCardio")));
        assertThat(properties(map(schemas.get("PlannedCardio"))).keySet())
                .containsExactlyInAnyOrderElementsOf(componentNames(Class.forName("app.keel.training.ProgramController$PlannedCardio")));
        assertThat(properties(map(schemas.get("CardioPlan"))).keySet())
                .containsExactlyInAnyOrderElementsOf(componentNames(Class.forName("app.keel.training.ProgramController$CardioPlan")));
        assertThat(list(map(schemas.get("CardioPlace")).get("enum"))).containsExactlyElementsOf(names(app.keel.engine.CardioPlacement.values()));
        assertThat(list(map(schemas.get("CardioSource")).get("enum"))).containsExactlyElementsOf(names(app.keel.engine.CardioOrigin.values()));
    }

    @Test
    void aCardioSessionIsTheServersFieldForFieldItsEnergyOnlyAWatchsOwnReading() throws Exception {
        // ADR-074 #5: the active energy an Apple Watch measured, passed through, optional (no watch, no number).
        Map<String, Object> schemas = schemas();
        Map<String, Object> session = map(schemas.get("NewCardioSession"));

        assertThat(properties(session).keySet())
                .containsExactlyInAnyOrderElementsOf(componentNames(Class.forName("app.keel.training.CardioController$NewCardioSession")));
        assertThat(list(session.get("required"))).doesNotContain("activeEnergyKcal");
        assertThat(SINGLE_CALORIE_NUMBERS).contains("NewCardioSession.activeEnergyKcal");
        assertThat(list(map(schemas.get("CardioLogSource")).get("enum")))
                .containsExactlyElementsOf(names((Enum<?>[]) Class.forName("app.keel.training.CardioStore$Source").getEnumConstants()));
        assertThat(map(map(map(contract().get("paths")).get("/v1/cardio-sessions")).get("post")).get("operationId")).isEqualTo("logCardioSession");
        assertThat(map(map(map(contract().get("paths")).get("/v1/program/cardio")).get("put")).get("operationId")).isEqualTo("putProgramCardio");
        // Back to the coach's default (ADR-074 Ek 1).
        assertThat(map(map(map(contract().get("paths")).get("/v1/program/cardio")).get("delete")).get("operationId")).isEqualTo("deleteProgramCardio");
    }

    private static List<String> componentNames(Class<?> record) {
        return Arrays.stream(record.getRecordComponents()).map(RecordComponent::getName).toList();
    }

    @Test
    void reasonAndSourceAreTheEnginesRecords() throws IOException {
        Map<String, Object> schemas = schemas();

        assertThat(properties(map(schemas.get("Reason"))).keySet()).containsExactlyInAnyOrderElementsOf(names(Reason.class));
        // The engine's Source less its reference: the research path stays on the server, with the kept call (K-523,
        // ADR-041 #72) — the app gets what kind of source a rule rests on, not where it is written down.
        List<String> sent = new ArrayList<>(names(Source.class));
        sent.remove("reference");
        assertThat(sent).containsExactly("tag");
        assertThat(properties(map(schemas.get("Source"))).keySet()).containsExactlyInAnyOrderElementsOf(sent);
    }

    @Test
    void theContractNamesNoResearchPathAndNoPerson() throws IOException {
        // K-523 (ADR-041 #72): nothing the app is told, field or description, points into arastirma/ or names a person.
        String contract = Files.readString(CONTRACT);
        assertThat(contract).doesNotContain("arastirma/");
        assertThat(PersonNames.in(contract)).isEmpty();
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
        assertThat(list(map(schemas.get("Sex")).get("enum"))).containsExactlyElementsOf(names(Sex.values()));
        assertThat(list(map(schemas.get("ActivityLevel")).get("enum"))).containsExactlyElementsOf(names(ActivityLevel.values()));
        // What a move's load is made of (ADR-032): the app rounds and computes plates by it.
        assertThat(list(map(schemas.get("Equipment")).get("enum"))).containsExactlyElementsOf(names(app.keel.training.ExerciseCatalog.Equipment.values()));
        // What life brought (K-516): the states the server keeps, as the engine reads them.
        assertThat(list(map(schemas.get("StateKind")).get("enum"))).containsExactlyElementsOf(names(app.keel.engine.DeclaredContext.values()));
    }

    @Test
    void aProfileMadeBeforeTheNewOnboardingStaysValid() throws IOException {
        // ADR-072 #3-#4: the experience is optional, and the questions no longer asked stay optional where they were.
        Map<String, Object> schemas = schemas();
        Map<String, Object> profile = map(schemas.get("Profile"));
        Map<String, Object> schedule = map(schemas.get("Schedule"));

        assertThat(properties(profile)).containsKey("experience");
        assertThat(list(profile.get("required"))).doesNotContain("experience");
        assertThat(list(map(schemas.get("Experience")).get("enum"))).containsExactlyElementsOf(names(app.keel.profile.Experience.values()));
        assertThat(properties(schedule)).containsKeys("usualTrainingTime", "sessionsLastMonth");
        assertThat(list(schedule.get("required"))).doesNotContain("usualTrainingTime", "sessionsLastMonth");
    }

    @Test
    void aStartingWeightIsAMoveAndItsLoad() throws IOException {
        // ADR-072 #5: the move's id and a load in kg; the answer is the program with it as the first target.
        Map<String, Object> put = map(map(map(contract().get("paths")).get("/v1/program/starting-weights")).get("put"));
        Map<String, Object> weight = map(map(properties(map(schemas().get("StartingWeights"))).get("weights")).get("items"));

        assertThat(put.get("operationId")).isEqualTo("putStartingWeights");
        assertThat(list(weight.get("required"))).containsExactlyInAnyOrder("exerciseId", "kg");
        assertThat(properties(weight).keySet()).containsExactlyInAnyOrder("exerciseId", "kg");
    }

    @Test
    void everyCalorieEstimateIsARange() throws IOException {
        // U5, over every schema at any depth — nested objects, allOf branches, array items, and the inline schemas of
        // paths: a property whose name says kcal, calorie or energy is a range, or one of the single numbers above.
        List<String> problems = new ArrayList<>();
        walk("components", map(contract().get("components")), problems);
        walk("paths", map(contract().get("paths")), problems);

        assertThat(problems).isEmpty();
        assertThat(properties(map(schemas().get("KcalRange"))).keySet()).containsExactlyInAnyOrder("low", "high");
        assertThat(properties(map(schemas().get("KcalBalance"))).keySet()).containsExactlyInAnyOrder("low", "high");
    }

    @Test
    void theCalorieWalkSeesNestedAndInlineFields() {
        Map<String, Object> nested = Map.of("schemas", Map.of("DayBudget", Map.of("properties", Map.of(
                "left", Map.of("properties", Map.of("kcal", Map.of("type", "integer")))))),
                "Other", Map.of("allOf", List.of(Map.of("properties", Map.of("calories", Map.of("type", "integer"))))));
        List<String> problems = new ArrayList<>();
        walk("components", new LinkedHashMap<>(nested), problems);

        assertThat(problems).containsExactlyInAnyOrder("components.schemas.DayBudget.left.kcal", "components.Other.allOf.0.calories");
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
            if (operation.containsKey("security") && list(operation.get("security")).stream().anyMatch(entry -> map(entry).isEmpty())) {
                problems.add(where + ": an empty security entry makes the session optional");
            }
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

    /** Every property at any depth whose name is about calories and is neither a range nor a known single number. */
    private static void walk(String where, Map<String, Object> node, List<String> problems) {
        node.forEach((key, value) -> {
            String here = where + "." + key;
            if (value instanceof Map<?, ?> child) {
                if (where.endsWith(".properties") || where.equals("properties")) {
                    checkCalorie(where, key, map(child), problems);
                }
                walk(here, map(child), problems);
            } else if (value instanceof List<?> items) {
                for (int i = 0; i < items.size(); i++) {
                    if (items.get(i) instanceof Map<?, ?> item) {
                        walk(here + "." + i, map(item), problems);
                    }
                }
            }
        });
    }

    private static void checkCalorie(String where, String property, Map<String, Object> definition, List<String> problems) {
        String name = property.toLowerCase(Locale.ROOT);
        if (!name.contains("kcal") && !name.contains("calor") && !name.contains("energy")) {
            return;
        }
        String owner = where.substring(0, where.length() - ".properties".length());
        String ownerName = owner.substring(owner.lastIndexOf('.') + 1);
        boolean range = definition.get("$ref") instanceof String ref && RANGES.contains(ref);
        if (!range && !SINGLE_CALORIE_NUMBERS.contains(ownerName + "." + property)) {
            problems.add(owner.replace(".properties", "") + "." + property);
        }
    }

    private static String typeOf(Map<String, Object> property) {
        return property.get("$ref") instanceof String ref ? ref.substring(ref.lastIndexOf('/') + 1) : (String) property.get("type");
    }

    private static String jsonTypeOf(Class<?> type) {
        if (type == int.class || type == Integer.class || type == long.class) {
            return "integer";
        }
        if (type == BigDecimal.class || type == double.class) {
            return "number";
        }
        if (type == List.class) {
            return "array"; // the first week's missed weekdays (K-962)
        }
        return type.getSimpleName(); // an engine enum: the schema of the same name
    }

    private static List<String> names(Class<? extends Record> record) {
        return Arrays.stream(record.getRecordComponents()).map(RecordComponent::getName).toList();
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
