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
import org.yaml.snakeyaml.LoaderOptions;
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

    @Test
    void refusesAWholeNumberReadOfAUnitThatAllowsFractions() {
        // weekly_loss_cap_kg is 1.0 today, but kg allows 0.8 tomorrow: a rule must not depend on the value's luck.
        Parameters male = ParameterSet.fromDocuments(repositoryDocuments()).forSex(Sex.MALE);

        assertThatThrownBy(() -> male.wholeNumber(ParameterKey.WEEKLY_LOSS_CAP_KG))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("weekly_loss_cap_kg");
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
                .hasMessageContaining("top-level 'parameters' list");
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

    // ── invalid: values that have the right type but the wrong meaning ──────────────────────────────────────

    @Test
    void failsOnAFractionWhereTheUnitCountsWholeThings() {
        Map<String, Object> documents = repositoryDocuments();
        bySex(documents, "windows.yaml", "decision_window_days").put("female", 28.5);

        assertProblem(documents, "windows.yaml", "decision_window_days", "whole number");
    }

    @Test
    void failsOnARatioWrittenAsAPercentage() {
        // 0.08 means 8 %. Writing 8 would mean 800 % and the rapid-loss stop could never fire.
        Map<String, Object> documents = repositoryDocuments();
        entry(documents, "safety.yaml", "rapid_loss_narrow_pct").put("value", 8);

        assertProblem(documents, "safety.yaml", "rapid_loss_narrow_pct", "between 0 and 1");
    }

    @Test
    void failsOnZeroOrNegativeAmounts() {
        Map<String, Object> negative = repositoryDocuments();
        entry(negative, "nutrition.yaml", "cut_step_min_kcal").put("value", -500);
        Map<String, Object> zero = repositoryDocuments();
        entry(zero, "safety.yaml", "weekly_loss_cap_kg").put("value", 0);

        assertProblem(negative, "nutrition.yaml", "cut_step_min_kcal", "greater than 0");
        assertProblem(zero, "safety.yaml", "weekly_loss_cap_kg", "greater than 0");
    }

    @Test
    void acceptsZeroRepsInReserve() {
        // RIR 0 is a real target (a set taken to failure), unlike a zero-day window.
        Map<String, Object> documents = repositoryDocuments();
        entry(documents, "training.yaml", "target_rir_max").put("value", 0);

        assertThat(ParameterSet.fromDocuments(documents).forSex(Sex.MALE).wholeNumber(ParameterKey.TARGET_RIR_MAX)).isZero();
    }

    @Test
    void failsOnAPercentAbove100() {
        Map<String, Object> documents = repositoryDocuments();
        bySex(documents, "safety.yaml", "bulk_ceiling_fat_proxy_pct").put("female", 130);

        assertProblem(documents, "safety.yaml", "bulk_ceiling_fat_proxy_pct", "between 0 and 100");
    }

    @Test
    void failsWhenALowerBoundIsAboveItsUpperBound() {
        Map<String, Object> protein = repositoryDocuments();
        entry(protein, "nutrition.yaml", "protein_g_per_kg").put("value", 3.0); // max is 2.5
        Map<String, Object> femaleFat = repositoryDocuments();
        bySex(femaleFat, "nutrition.yaml", "fat_g_per_kg_min").put("female", 1.2); // max is 1.0

        assertProblem(protein, "nutrition.yaml", "protein_g_per_kg", "protein_g_per_kg_max");
        assertProblem(femaleFat, "nutrition.yaml", "fat_g_per_kg_min", "female");
    }

    @Test
    void failsWhenTheLowEnergyThresholdIsNotBelowTheAdequateLevel() {
        Map<String, Object> documents = repositoryDocuments();
        bySex(documents, "safety.yaml", "lea_threshold_kcal_per_kg_ffm").put("male", 45); // adequate is 45

        assertProblem(documents, "safety.yaml", "lea_threshold_kcal_per_kg_ffm", "ea_adequate_kcal_per_kg_ffm");
    }

    @Test
    void failsWhenTheWarningLineIsNotBetweenTheLowAndAdequateLines() {
        Map<String, Object> underLow = repositoryDocuments();
        bySex(underLow, "safety.yaml", "ea_warning_kcal_per_kg_ffm").put("female", 30); // female LEA line is 30
        Map<String, Object> overAdequate = repositoryDocuments();
        bySex(overAdequate, "safety.yaml", "ea_warning_kcal_per_kg_ffm").put("male", 45); // adequate is 45

        assertProblem(underLow, "safety.yaml", "lea_threshold_kcal_per_kg_ffm", "ea_warning_kcal_per_kg_ffm");
        assertProblem(overAdequate, "safety.yaml", "ea_warning_kcal_per_kg_ffm", "ea_adequate_kcal_per_kg_ffm");
    }

    @Test
    void failsWhenTheAdherenceFixLineIsNotBelowOnTrack() {
        Map<String, Object> documents = repositoryDocuments();
        entry(documents, "windows.yaml", "adherence_fix_below").put("value", 0.7); // on track is 0.7

        assertProblem(documents, "windows.yaml", "adherence_fix_below", "on_track_min_ratio");
    }

    @Test
    void failsOnNotANumber() {
        Map<String, Object> documents = repositoryDocuments();
        entry(documents, "measurement.yaml", "whtr_threshold").put("value", Double.NaN);

        assertProblem(documents, "measurement.yaml", "whtr_threshold", "finite");
    }

    @Test
    void failsOnAWholeNumberTooLargeToUse() {
        Map<String, Object> documents = repositoryDocuments();
        entry(documents, "windows.yaml", "evaluation_window_days").put("value", new java.math.BigInteger("99999999999"));

        assertProblem(documents, "windows.yaml", "evaluation_window_days", "too large");
    }

    // ── invalid: malformed entries ──────────────────────────────────────────────────────────────────────────

    @Test
    void failsOnAnEntryWithoutAKeyOrWithANonTextKey() {
        Map<String, Object> missing = repositoryDocuments();
        entry(missing, "windows.yaml", "trend_display_days").remove("key");
        Map<String, Object> number = repositoryDocuments();
        entry(number, "windows.yaml", "trend_display_days").put("key", 7);

        assertProblem(missing, "windows.yaml", "<no key>", "missing key");
        assertProblem(number, "windows.yaml", "7", "must be text");
    }

    @Test
    void failsOnANullFieldNameWithoutCrashing() {
        // YAML "~: 3" gives a null map key.
        Map<String, Object> documents = repositoryDocuments();
        entry(documents, "windows.yaml", "trend_display_days").put(null, 3);

        assertProblem(documents, "windows.yaml", "trend_display_days", "unknown field 'null'");
    }

    @Test
    void failsOnAnItemThatIsNotAMapping() {
        Map<String, Object> documents = repositoryDocuments();
        parametersRaw(documents, "windows.yaml").add("trend_display_days: 7");

        assertThatThrownBy(() -> ParameterSet.fromDocuments(documents))
                .isInstanceOf(InvalidParametersException.class).hasMessageContaining("windows.yaml")
                .hasMessageContaining("must be a mapping");
    }

    @Test
    void failsOnAnEmptyFile() {
        Map<String, Object> documents = repositoryDocuments();
        documents.put("windows.yaml", null);

        assertThatThrownBy(() -> ParameterSet.fromDocuments(documents))
                .isInstanceOf(InvalidParametersException.class).hasMessageContaining("windows.yaml")
                .hasMessageContaining("top-level 'parameters' list");
    }

    @Test
    void failsWhenBySexIsNotAMappingOrNamesAThirdSex() {
        Map<String, Object> scalar = repositoryDocuments();
        entry(scalar, "windows.yaml", "decision_window_days").put("by_sex", 21);
        Map<String, Object> third = repositoryDocuments();
        bySex(third, "windows.yaml", "decision_window_days").put("other", 25);

        assertProblem(scalar, "windows.yaml", "decision_window_days", "must be a mapping");
        assertProblem(third, "windows.yaml", "decision_window_days", "by_sex");
    }

    @Test
    void reportsEveryProblemInsideOneEntry() {
        Map<String, Object> documents = repositoryDocuments();
        Map<String, Object> window = entry(documents, "windows.yaml", "trend_display_days");
        window.remove("unit");
        window.remove("source");

        assertThatThrownBy(() -> ParameterSet.fromDocuments(documents))
                .isInstanceOfSatisfying(InvalidParametersException.class, e -> assertThat(e.problems())
                        .anySatisfy(problem -> assertThat(problem).contains("trend_display_days").contains("unit"))
                        .anySatisfy(problem -> assertThat(problem).contains("trend_display_days").contains("source")));
    }

    @Test
    void reportsAMissingFileOnce() {
        Map<String, Object> documents = repositoryDocuments();
        documents.remove("training.yaml");

        assertThatThrownBy(() -> ParameterSet.fromDocuments(documents))
                .isInstanceOfSatisfying(InvalidParametersException.class,
                        e -> assertThat(e.problems()).containsExactly("training.yaml: file missing"));
    }

    @Test
    void mapsEveryTagToItsSourceTag() {
        Map<ParameterKey, Parameter> loaded = ParameterSet.fromDocuments(repositoryDocuments()).parameters();

        assertThat(loaded.get(ParameterKey.CUT_STEP_MIN_KCAL).source().tag()).isEqualTo(SourceTag.EXPERIENCE);
        assertThat(loaded.get(ParameterKey.DECISION_WINDOW_DAYS).source().tag()).isEqualTo(SourceTag.LITERATURE);
    }

    @Test
    void anExceptionAlwaysNamesAtLeastOneProblem() {
        assertThatThrownBy(() -> new InvalidParametersException(List.of()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void theCallerMustRejectDuplicateYamlKeys() {
        // SnakeYAML's default keeps the last duplicate and only logs a warning; the engine would never see the
        // first value. Callers parse with duplicates disallowed, as this test's reader does.
        String twoValues = "parameters:\n  - key: trend_display_days\n    value: 7\n    value: 14\n";

        assertThatThrownBy(() -> strictYaml().load(twoValues))
                .isInstanceOf(org.yaml.snakeyaml.constructor.DuplicateKeyException.class);
    }

    // ── version hash: every part that can change a decision ─────────────────────────────────────────────────

    @Test
    void theVersionHashChangesWhenOnlyOneSexsValueChanges() {
        String before = ParameterSet.fromDocuments(repositoryDocuments()).versionHash();
        Map<String, Object> female = repositoryDocuments();
        bySex(female, "windows.yaml", "decision_window_days").put("female", 35);
        Map<String, Object> male = repositoryDocuments();
        bySex(male, "windows.yaml", "decision_window_days").put("male", 14);

        assertThat(ParameterSet.fromDocuments(female).versionHash()).isNotEqualTo(before);
        assertThat(ParameterSet.fromDocuments(male).versionHash()).isNotEqualTo(before);
    }

    @Test
    void theVersionHashChangesWhenAFlagFlips() {
        String before = ParameterSet.fromDocuments(repositoryDocuments()).versionHash();
        Map<String, Object> documents = repositoryDocuments();
        entry(documents, "safety.yaml", "bmr_floor_enabled").put("value", false);

        assertThat(ParameterSet.fromDocuments(documents).versionHash()).isNotEqualTo(before);
    }

    @Test
    void theVersionHashFormatIsPinned() {
        // Stored hashes must stay comparable across releases (ADR-003 §6). The expected value was computed outside
        // Java: printf 'bmr_floor_enabled|boolean|true|true\ndecision_window_days|days|21|28' | shasum -a 256
        Map<ParameterKey, Parameter> two = new java.util.EnumMap<>(ParameterKey.class);
        Source source = new Source("arastirma/ham/J1-cinsiyet.md#D1", SourceTag.LITERATURE);
        two.put(ParameterKey.DECISION_WINDOW_DAYS, new Parameter(ParameterKey.DECISION_WINDOW_DAYS,
                decimal(21), decimal(28), source));
        two.put(ParameterKey.BMR_FLOOR_ENABLED, new Parameter(ParameterKey.BMR_FLOOR_ENABLED,
                new ParameterValue.Flag(true), new ParameterValue.Flag(true), source));

        assertThat(ParameterSet.hashOf(two)).isEqualTo(PINNED_HASH);
    }

    private static final String PINNED_HASH = "e2809c59ee5ffed9a089677fdfd6b421dd291a5563f2c48d6b10e0857d5929e4";

    private static ParameterValue decimal(long value) {
        return new ParameterValue.Decimal(java.math.BigDecimal.valueOf(value));
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
        Map<String, Object> step = entry(documents, "nutrition.yaml", "cut_step_min_kcal");
        step.put("value", ((Number) step.get("value")).intValue() + 1);

        assertThat(ParameterSet.fromDocuments(documents).versionHash()).isNotEqualTo(before);
    }

    @Test
    void theVersionHashIgnoresNotesSourcesAndOrder() {
        // Only what can change a decision is versioned: key, unit, values. A reworded note or a reordered file
        // must not look like a new rule set.
        String before = ParameterSet.fromDocuments(repositoryDocuments()).versionHash();
        Map<String, Object> documents = repositoryDocuments();
        entry(documents, "nutrition.yaml", "cut_step_min_kcal").put("note", "reworded");
        entry(documents, "nutrition.yaml", "cut_step_min_kcal").put("source", "arastirma/ham/guray/G7-whisper-arsiv.md#K-98");
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
                documents.put(domain.fileName(), strictYaml().load(reader));
            } catch (IOException e) {
                throw new IllegalStateException("Cannot read " + domain.fileName(), e);
            }
        }
        return documents;
    }

    /** How callers must parse parameter files: a repeated key is an error, not "last one wins". */
    static Yaml strictYaml() {
        LoaderOptions options = new LoaderOptions();
        options.setAllowDuplicateKeys(false);
        return new Yaml(options);
    }

    @SuppressWarnings("unchecked")
    private static List<Object> parametersRaw(Map<String, Object> documents, String file) {
        return (List<Object>) ((Map<String, Object>) documents.get(file)).get("parameters");
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> bySex(Map<String, Object> documents, String file, String key) {
        return (Map<String, Object>) entry(documents, file, key).get("by_sex");
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
