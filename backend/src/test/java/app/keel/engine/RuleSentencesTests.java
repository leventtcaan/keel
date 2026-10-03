package app.keel.engine;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

/**
 * Every rule the engine can give has its own sentence in the app's copy (K-522, prototype 3.5, Ö-25): "Why this call"
 * says each rule in words, not only its kind of source. The rules are the engine's {@link RuleId} constants, read from
 * the classes themselves; the count of {@code new RuleId("…")} in the sources makes sure none is declared elsewhere.
 */
class RuleSentencesTests {

    private static final Path ENGINE = Path.of("src/main/java/app/keel/engine");
    private static final Path COPY = Path.of("../data/copy/en.json");
    private static final Pattern DECLARED = Pattern.compile("new RuleId\\(\"([a-z0-9_]+)\"\\)");

    @Test
    void everyRuleTheEngineCanGiveHasASentence() throws Exception {
        Map<?, ?> sentences = sentences();
        List<String> missing = new ArrayList<>();
        for (String rule : engineRules()) {
            if (!(sentences.get(rule) instanceof String sentence) || sentence.isBlank()) {
                missing.add(rule);
            }
        }
        assertThat(missing).as("rules without decision.rule.<rule> in en.json").isEmpty();
    }

    @Test
    void noSentenceForARuleTheEngineDoesNotHave() throws Exception {
        assertThat(new TreeSet<>(sentences().keySet().stream().map(String::valueOf).toList())).isEqualTo(engineRules());
    }

    @Test
    void theRulesAreTheConstantsAndNothingElse() throws Exception {
        TreeSet<String> written = new TreeSet<>();
        try (Stream<Path> files = Files.list(ENGINE)) {
            for (Path file : files.filter(f -> f.toString().endsWith(".java")).toList()) {
                Matcher found = DECLARED.matcher(Files.readString(file));
                while (found.find()) {
                    written.add(found.group(1));
                }
            }
        }
        assertThat(engineRules()).isEqualTo(written).hasSizeGreaterThan(50);
    }

    /** The values of every static RuleId field of the engine's classes. */
    static TreeSet<String> engineRules() throws IOException, ReflectiveOperationException {
        TreeSet<String> rules = new TreeSet<>();
        try (Stream<Path> files = Files.list(ENGINE)) {
            for (Path file : files.filter(f -> f.toString().endsWith(".java")).toList()) {
                String name = file.getFileName().toString().replace(".java", "");
                if (name.equals("package-info")) {
                    continue;
                }
                for (Field field : Class.forName("app.keel.engine." + name).getDeclaredFields()) {
                    if (Modifier.isStatic(field.getModifiers()) && field.getType() == RuleId.class) {
                        field.setAccessible(true);
                        rules.add(((RuleId) field.get(null)).value());
                    }
                }
            }
        }
        return rules;
    }

    private static Map<?, ?> sentences() throws IOException {
        Map<?, ?> copy = JsonMapper.builder().build().readValue(Files.readString(COPY), Map.class);
        Object rule = ((Map<?, ?>) copy.get("decision")).get("rule");
        return rule instanceof Map<?, ?> found ? found : Map.of();
    }
}
