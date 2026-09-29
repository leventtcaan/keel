package app.keel.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.io.Reader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

/**
 * K-102: data/parameters/*.yaml → a checked, typed ParameterSet (K2, U14, ADR-010).
 *
 * <p>The engine does no I/O (ADR-003), so this test reads the files and hands the parsed YAML to the engine —
 * exactly what the decision module will do at startup. Invalid cases start from the real files and break one thing.
 */
class ParametersLoaderTests {

    private static final Path PARAMETERS_DIR = Path.of("../data/parameters");

    // ── valid ───────────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void loadsTheRepositoryParameters() {
        ParameterSet set = ParameterSet.fromDocuments(repositoryDocuments());

        assertThat(set.parameters()).hasSize(ParameterKey.values().length);
    }

    @Test
    void resolvesBySexValuesForTheUsersSex() {
        // windows.yaml: decision_window_days by_sex {male: 21, female: 28} (J1-cinsiyet D1)
        ParameterSet set = ParameterSet.fromDocuments(repositoryDocuments());

        assertThat(set.forSex(Sex.MALE).wholeNumber(ParameterKey.DECISION_WINDOW_DAYS)).isEqualTo(21);
        assertThat(set.forSex(Sex.FEMALE).wholeNumber(ParameterKey.DECISION_WINDOW_DAYS)).isEqualTo(28);
    }

    @Test
    void givesASingleValueToBothSexes() {
        // nutrition.yaml: cut_step_min_kcal 500 (Güray K-97); measurement.yaml: whtr_threshold 0.5
        ParameterSet set = ParameterSet.fromDocuments(repositoryDocuments());

        assertThat(set.forSex(Sex.MALE).wholeNumber(ParameterKey.CUT_STEP_MIN_KCAL)).isEqualTo(500);
        assertThat(set.forSex(Sex.FEMALE).wholeNumber(ParameterKey.CUT_STEP_MIN_KCAL)).isEqualTo(500);
        assertThat(set.forSex(Sex.FEMALE).number(ParameterKey.WHTR_THRESHOLD)).isEqualTo(0.5);
    }

    @Test
    void readsFlagsAndFractions() {
        // safety.yaml: bmr_floor_enabled true; nutrition.yaml: fat_g_per_kg_min by_sex {male: 0.5, female: 0.75}
        Parameters female = ParameterSet.fromDocuments(repositoryDocuments()).forSex(Sex.FEMALE);

        assertThat(female.flag(ParameterKey.BMR_FLOOR_ENABLED)).isTrue();
        assertThat(female.number(ParameterKey.FAT_G_PER_KG_MIN)).isEqualTo(0.75);
    }

    @Test
    void keepsEachParametersSource() {
        ParameterSet set = ParameterSet.fromDocuments(repositoryDocuments());

        assertThat(set.parameters().get(ParameterKey.CUT_STEP_MIN_KCAL))
                .extracting(Parameter::source)
                .isEqualTo(new Source("arastirma/ham/guray/G7-whisper-arsiv.md#K-97", SourceTag.EXPERIENCE));
    }

    @Test
    void refusesToReadANumberAsAFlagOrAFractionAsAWholeNumber() {
        Parameters male = ParameterSet.fromDocuments(repositoryDocuments()).forSex(Sex.MALE);

        assertThatThrownBy(() -> male.flag(ParameterKey.CUT_STEP_MIN_KCAL))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("cut_step_min_kcal");
        assertThatThrownBy(() -> male.number(ParameterKey.BMR_FLOOR_ENABLED))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("bmr_floor_enabled");
        assertThatThrownBy(() -> male.wholeNumber(ParameterKey.WHTR_THRESHOLD))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("whtr_threshold");
    }

    // ── invalid: one broken thing each ──────────────────────────────────────────────────────────────────────

    @Test
    void failsOnAMissingUnit() {
        Map<String, Object> documents = repositoryDocuments();
        entry(documents, "windows.yaml", "decision_window_days").remove("unit");

        assertProblem(documents, "windows.yaml", "decision_window_days", "unit");
    }

    @Test
    void failsOnAMissingSource() {
        Map<String, Object> documents = repositoryDocuments();
        entry(documents, "nutrition.yaml", "cut_step_min_kcal").remove("source");

        assertProblem(documents, "nutrition.yaml", "cut_step_min_kcal", "source");
    }

    @Test
    void failsOnASourceOutsideTheResearchFolder() {
        Map<String, Object> documents = repositoryDocuments();
        entry(documents, "nutrition.yaml", "cut_step_min_kcal").put("source", "a coach said so");

        assertProblem(documents, "nutrition.yaml", "cut_step_min_kcal", "source");
    }

    @Test
    void failsOnAMissingOrUnknownTag() {
        Map<String, Object> missing = repositoryDocuments();
        entry(missing, "safety.yaml", "weekly_loss_cap_kg").remove("tag");
        Map<String, Object> unknown = repositoryDocuments();
        entry(unknown, "safety.yaml", "weekly_loss_cap_kg").put("tag", "forum");

        assertProblem(missing, "safety.yaml", "weekly_loss_cap_kg", "tag");
        assertProblem(unknown, "safety.yaml", "weekly_loss_cap_kg", "tag");
    }

    @Test
    void failsWithoutAValueOrWithBothKindsOfValue() {
        Map<String, Object> none = repositoryDocuments();
        entry(none, "windows.yaml", "no_interpretation_days").remove("value");
        Map<String, Object> both = repositoryDocuments();
        entry(both, "windows.yaml", "no_interpretation_days").put("by_sex", Map.of("male", 14, "female", 14));

        assertProblem(none, "windows.yaml", "no_interpretation_days", "value");
        assertProblem(both, "windows.yaml", "no_interpretation_days", "value");
    }

    @Test
    void failsWhenBySexDoesNotNameExactlyMaleAndFemale() {
        Map<String, Object> documents = repositoryDocuments();
        entry(documents, "windows.yaml", "decision_window_days").put("by_sex", Map.of("male", 21));

        assertProblem(documents, "windows.yaml", "decision_window_days", "by_sex");
    }

    @Test
    void failsOnAnUnknownKey() {
        Map<String, Object> documents = repositoryDocuments();
        entry(documents, "windows.yaml", "trend_display_days").put("key", "trend_display_dayz");

        assertProblem(documents, "windows.yaml", "trend_display_dayz", "unknown");
    }

    @Test
    void failsOnAnUnknownField() {
        Map<String, Object> documents = repositoryDocuments();
        entry(documents, "windows.yaml", "trend_display_days").put("vaule", 7);

        assertProblem(documents, "windows.yaml", "trend_display_days", "vaule");
    }

    @Test
    void failsWhenAKnownParameterIsMissing() {
        Map<String, Object> documents = repositoryDocuments();
        parameters(documents, "safety.yaml").remove(entry(documents, "safety.yaml", "rapid_loss_window_weeks"));

        assertProblem(documents, "safety.yaml", "rapid_loss_window_weeks", "missing");
    }

    @Test
    void failsOnADuplicateKey() {
        Map<String, Object> documents = repositoryDocuments();
        parameters(documents, "safety.yaml").add(new LinkedHashMap<>(entry(documents, "safety.yaml", "weekly_loss_cap_kg")));

        assertProblem(documents, "safety.yaml", "weekly_loss_cap_kg", "duplicate");
    }

    @Test
    void failsWhenAParameterIsInTheWrongFile() {
        Map<String, Object> documents = repositoryDocuments();
        Map<String, Object> moved = entry(documents, "windows.yaml", "trend_display_days");
        parameters(documents, "windows.yaml").remove(moved);
        parameters(documents, "safety.yaml").add(moved);

        assertProblem(documents, "safety.yaml", "trend_display_days", "windows.yaml");
    }

    @Test
    void failsWhenTheUnitIsNotTheOneTheCodeAssumes() {
        Map<String, Object> documents = repositoryDocuments();
        entry(documents, "training.yaml", "load_increment_upper_kg").put("unit", "lb");

        assertProblem(documents, "training.yaml", "load_increment_upper_kg", "unit");
    }

    @Test
    void failsWhenTheValueHasTheWrongKind() {
        Map<String, Object> textForNumber = repositoryDocuments();
        entry(textForNumber, "nutrition.yaml", "cut_step_min_kcal").put("value", "five hundred");
        Map<String, Object> numberForFlag = repositoryDocuments();
        entry(numberForFlag, "safety.yaml", "bmr_floor_enabled").put("value", 1);

        assertProblem(textForNumber, "nutrition.yaml", "cut_step_min_kcal", "number");
        assertProblem(numberForFlag, "safety.yaml", "bmr_floor_enabled", "true or false");
    }

    @Test
    void failsWhenAFileIsMissingOrIsNotAnEngineFile() {
        Map<String, Object> missing = repositoryDocuments();
        missing.remove("training.yaml");
        Map<String, Object> extra = repositoryDocuments();
        extra.put("quota.yaml", Map.of("parameters", List.of()));

        assertThatThrownBy(() -> ParameterSet.fromDocuments(missing))
                .isInstanceOf(InvalidParametersException.class).hasMessageContaining("training.yaml");
        assertThatThrownBy(() -> ParameterSet.fromDocuments(extra))
                .isInstanceOf(InvalidParametersException.class).hasMessageContaining("quota.yaml");
    }

    @Test
    void failsOnADocumentWithoutAParametersList() {
        Map<String, Object> documents = repositoryDocuments();
        documents.put("windows.yaml", Map.of("params", List.of()));

        assertThatThrownBy(() -> ParameterSet.fromDocuments(documents))
                .isInstanceOf(InvalidParametersException.class).hasMessageContaining("windows.yaml")
                .hasMessageContaining("parameters");
    }

    @Test
    void reportsEveryProblemAtOnce() {
        // One failed start should show everything to fix, not one problem per restart.
        Map<String, Object> documents = repositoryDocuments();
        entry(documents, "windows.yaml", "decision_window_days").remove("unit");
        entry(documents, "nutrition.yaml", "cut_step_min_kcal").remove("source");

        assertThatThrownBy(() -> ParameterSet.fromDocuments(documents))
                .isInstanceOfSatisfying(InvalidParametersException.class,
                        e -> assertThat(e.problems()).hasSize(2));
    }

    // ── version hash ────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void theVersionHashIsAStableSha256() {
        String first = ParameterSet.fromDocuments(repositoryDocuments()).versionHash();
        String second = ParameterSet.fromDocuments(repositoryDocuments()).versionHash();

        assertThat(first).matches("[0-9a-f]{64}").isEqualTo(second);
    }

    @Test
    void theVersionHashChangesWhenAValueChanges() {
        String before = ParameterSet.fromDocuments(repositoryDocuments()).versionHash();
        Map<String, Object> documents = repositoryDocuments();
        entry(documents, "nutrition.yaml", "cut_step_min_kcal").put("value", 400);

        assertThat(ParameterSet.fromDocuments(documents).versionHash()).isNotEqualTo(before);
    }

    @Test
    void theVersionHashIgnoresNotesSourcesAndOrder() {
        // Only what can change a decision is versioned: key, unit, values. A reworded note or a reordered file
        // must not look like a new rule set.
        String before = ParameterSet.fromDocuments(repositoryDocuments()).versionHash();
        Map<String, Object> documents = repositoryDocuments();
        entry(documents, "nutrition.yaml", "cut_step_min_kcal").put("note", "reworded");
        entry(documents, "nutrition.yaml", "cut_step_min_kcal").put("source", "arastirma/ham/guray/G7-whisper-arsiv.md");
        Collections.reverse(parameters(documents, "training.yaml"));
        Map<String, Object> reorderedFiles = new LinkedHashMap<>();
        new ArrayList<>(documents.keySet()).reversed().forEach(file -> reorderedFiles.put(file, documents.get(file)));

        assertThat(ParameterSet.fromDocuments(reorderedFiles).versionHash()).isEqualTo(before);
    }

    @Test
    void theVersionHashTreatsOneAndOnePointZeroAsTheSameValue() {
        String before = ParameterSet.fromDocuments(repositoryDocuments()).versionHash();
        Map<String, Object> documents = repositoryDocuments();
        entry(documents, "nutrition.yaml", "fat_g_per_kg_max").put("value", 1); // was 1.0

        assertThat(ParameterSet.fromDocuments(documents).versionHash()).isEqualTo(before);
    }

    // ── helpers ─────────────────────────────────────────────────────────────────────────────────────────────

    /** Fresh, mutable copies of the engine's parameter files, parsed the way the decision module will parse them. */
    static Map<String, Object> repositoryDocuments() {
        Map<String, Object> documents = new LinkedHashMap<>();
        for (ParameterDomain domain : ParameterDomain.values()) {
            try (Reader reader = Files.newBufferedReader(PARAMETERS_DIR.resolve(domain.fileName()))) {
                documents.put(domain.fileName(), new Yaml().load(reader));
            } catch (IOException e) {
                throw new IllegalStateException("Cannot read " + domain.fileName(), e);
            }
        }
        return documents;
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> parameters(Map<String, Object> documents, String file) {
        return (List<Map<String, Object>>) ((Map<String, Object>) documents.get(file)).get("parameters");
    }

    private static Map<String, Object> entry(Map<String, Object> documents, String file, String key) {
        return parameters(documents, file).stream()
                .filter(parameter -> key.equals(parameter.get("key")))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(key + " not in " + file));
    }

    private static void assertProblem(Map<String, Object> documents, String file, String key, String mentions) {
        assertThatThrownBy(() -> ParameterSet.fromDocuments(documents))
                .isInstanceOfSatisfying(InvalidParametersException.class, e -> assertThat(e.problems())
                        .anySatisfy(problem -> assertThat(problem)
                                .contains(file).contains(key).containsIgnoringCase(mentions)));
    }
}
