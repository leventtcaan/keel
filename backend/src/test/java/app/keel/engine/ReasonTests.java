package app.keel.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** A Reason names the rule that fired and the research it comes from (U3, U14). */
class ReasonTests {

    private static final Source GURAY_SPINE = new Source("arastirma/03-guray-karar-omurgasi.md#2.4", SourceTag.EXPERIENCE);

    @Test
    void carriesRuleIdAndSource() {
        Reason reason = new Reason(new RuleId("weight_flat_on_plan"), GURAY_SPINE);

        assertThat(reason.rule()).isEqualTo(new RuleId("weight_flat_on_plan"));
        assertThat(reason.source()).isEqualTo(GURAY_SPINE);
    }

    @Test
    void rejectsAReasonWithoutRuleOrSource() {
        assertThatThrownBy(() -> new Reason(null, GURAY_SPINE))
                .isInstanceOf(NullPointerException.class).hasMessageContaining("rule");
        assertThatThrownBy(() -> new Reason(new RuleId("weight_flat_on_plan"), null))
                .isInstanceOf(NullPointerException.class).hasMessageContaining("source");
    }

    @ParameterizedTest
    @ValueSource(strings = {"data_insufficient", "window_not_full", "wc12", "a"})
    void acceptsSnakeCaseRuleIds(String value) {
        assertThat(new RuleId(value).value()).isEqualTo(value);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "Data_insufficient", "data-insufficient", "data insufficient", "1_rule", "_rule"})
    void rejectsRuleIdsThatAreNotSnakeCase(String value) {
        assertThatThrownBy(() -> new RuleId(value))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("RuleId");
    }

    @Test
    void rejectsANullRuleId() {
        assertThatThrownBy(() -> new RuleId(null)).isInstanceOf(NullPointerException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"arastirma/ham/H1-olcum.md#3.4", "arastirma/03-guray-karar-omurgasi.md#2.4",
            "arastirma/ham/guray/G7-whisper-arsiv.md#K-66"})
    void acceptsSourcesInsideTheResearchFolder(String reference) {
        assertThat(new Source(reference, SourceTag.LITERATURE).reference()).isEqualTo(reference);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "arastirma/", "docs/anayasa.md", "https://example.com/paper",
            "arastirma/ham/H1 olcum.md", "../arastirma/ham/H1-olcum.md",
            "arastirma/..", "arastirma/ham/..", "arastirma/../docs/anayasa.md", "arastirma/ham/../../docs/x.md",
            "arastirma/ham/", "arastirma//H1-olcum.md", "arastirma/ham/./H1-olcum.md", "arastirma\\ham\\H1-olcum.md",
            "arastirma/ham/H1-olcum", "arastirma/ham/H1-olcum.md#", "arastirma/ham/H1-olcum.md#K 1"})
    void rejectsSourcesOutsideTheResearchFolder(String reference) {
        assertThatThrownBy(() -> new Source(reference, SourceTag.LITERATURE))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Source");
    }

    // ADR-020 (U14): a whole file is not a source; the rule or section number is part of the reference.
    @ParameterizedTest
    @ValueSource(strings = {"arastirma/ham/H1-olcum.md", "arastirma/ham/guray/G7-whisper-arsiv.md"})
    void rejectsASourceWithoutARuleAnchor(String reference) {
        assertThatThrownBy(() -> new Source(reference, SourceTag.LITERATURE))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("#");
    }

    @Test
    void rejectsAReasonBackedOnlyByAProductDecision() {
        // U14: an engine rule rests on Güray's experience or the literature. A product call is not evidence.
        Source productCall = new Source("arastirma/04-faz3-urun.md#7.3", SourceTag.PRODUCT);

        assertThatThrownBy(() -> new Reason(new RuleId("consistency_week"), productCall))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("U14");
    }

    @Test
    void rejectsASourceWithoutReferenceOrTag() {
        assertThatThrownBy(() -> new Source(null, SourceTag.LITERATURE))
                .isInstanceOf(NullPointerException.class).hasMessageContaining("reference");
        assertThatThrownBy(() -> new Source("arastirma/ham/H1-olcum.md#3.4", null))
                .isInstanceOf(NullPointerException.class).hasMessageContaining("tag");
    }
}
