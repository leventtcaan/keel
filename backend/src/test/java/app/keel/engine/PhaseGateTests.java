package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static app.keel.engine.EngineFixtures.series;
import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

/**
 * The phase gate picks the direction; staying at maintenance is not one (Güray, 03 §2.1).
 * Bands come from data/parameters/safety.yaml (internal only, U4); a woman's band sits 10 points higher (J1 B1).
 * Each boundary: just below, at, just above.
 */
class PhaseGateTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 26);
    private static final BigDecimal STEP = new BigDecimal("0.1");

    private static BigDecimal band(Sex sex, ParameterKey key) {
        return BigDecimal.valueOf(parameters(sex).number(key));
    }

    // ── bulk ceiling ────────────────────────────────────────────────────────────────────────────────────────

    @ParameterizedTest
    @EnumSource(Sex.class)
    void aBulkAboveTheCeilingTurnsIntoACut(Sex sex) {
        BigDecimal justAbove = band(sex, ParameterKey.BULK_CEILING_FAT_PROXY_PCT).add(STEP);

        assertChangesTo(PhaseGate.check(snapshot(sex, Phase.BULK, justAbove), parameters(sex)), Phase.CUT, "bulk_ceiling");
    }

    @ParameterizedTest
    @EnumSource(Sex.class)
    void aBulkAtOrUnderTheCeilingContinues(Sex sex) {
        BigDecimal ceiling = band(sex, ParameterKey.BULK_CEILING_FAT_PROXY_PCT);

        assertThat(PhaseGate.check(snapshot(sex, Phase.BULK, ceiling), parameters(sex))).isNotPresent();
        assertThat(PhaseGate.check(snapshot(sex, Phase.BULK, ceiling.subtract(STEP)), parameters(sex))).isNotPresent();
    }

    @Test
    void theSameBodyFatMeansDifferentThingsForAManAndAWoman() {
        // 25 %: over a man's ceiling (20), inside a woman's band (25-30) — the +10 point offset (J1 B1).
        BigDecimal twentyFive = new BigDecimal("25");

        assertThat(PhaseGate.check(snapshot(Sex.MALE, Phase.BULK, twentyFive), parameters(Sex.MALE))).isPresent();
        assertThat(PhaseGate.check(snapshot(Sex.FEMALE, Phase.BULK, twentyFive), parameters(Sex.FEMALE))).isNotPresent();
    }

    // ── fat first ───────────────────────────────────────────────────────────────────────────────────────────

    @ParameterizedTest
    @EnumSource(Sex.class)
    void wellAboveTheCeilingTheReasonIsFatFirst(Sex sex) {
        // Güray G4 K-10: above ~25 % added muscle does not show; lose fat first.
        BigDecimal justAbove = band(sex, ParameterKey.FAT_FIRST_FAT_PROXY_PCT).add(STEP);

        assertChangesTo(PhaseGate.check(snapshot(sex, Phase.BULK, justAbove), parameters(sex)), Phase.CUT, "fat_first");
    }

    @ParameterizedTest
    @EnumSource(Sex.class)
    void exactlyAtTheFatFirstLineItIsStillTheCeilingReason(Sex sex) {
        BigDecimal atLine = band(sex, ParameterKey.FAT_FIRST_FAT_PROXY_PCT);

        assertChangesTo(PhaseGate.check(snapshot(sex, Phase.BULK, atLine), parameters(sex)), Phase.CUT, "bulk_ceiling");
    }

    // ── end of a cut ────────────────────────────────────────────────────────────────────────────────────────

    @ParameterizedTest
    @EnumSource(Sex.class)
    void aCutThatReachesTheBottomOfTheBandTurnsIntoABulk(Sex sex) {
        BigDecimal bandMin = band(sex, ParameterKey.BULK_BAND_MIN_FAT_PROXY_PCT);

        assertChangesTo(PhaseGate.check(snapshot(sex, Phase.CUT, bandMin), parameters(sex)), Phase.BULK, "cut_floor_reached");
        assertChangesTo(PhaseGate.check(snapshot(sex, Phase.CUT, bandMin.subtract(STEP)), parameters(sex)), Phase.BULK,
                "cut_floor_reached");
    }

    @ParameterizedTest
    @EnumSource(Sex.class)
    void aCutAboveTheBandContinues(Sex sex) {
        BigDecimal justAbove = band(sex, ParameterKey.BULK_BAND_MIN_FAT_PROXY_PCT).add(STEP);

        assertThat(PhaseGate.check(snapshot(sex, Phase.CUT, justAbove), parameters(sex))).isNotPresent();
    }

    // ── no estimate, sources, output ────────────────────────────────────────────────────────────────────────

    @Test
    void withoutABodyFatEstimateTheGateStaysOut() {
        Snapshot noEstimate = new Snapshot(TODAY, Sex.MALE, Phase.BULK, TODAY.minusDays(30), series(List.of()));

        assertThat(PhaseGate.check(noEstimate, parameters(Sex.MALE))).isNotPresent();
    }

    @Test
    void namesGuraysRuleAndForAWomanTheOffsetResearch() {
        Optional<Decision> man = PhaseGate.check(snapshot(Sex.MALE, Phase.BULK, new BigDecimal("22")), parameters(Sex.MALE));
        Optional<Decision> woman = PhaseGate.check(snapshot(Sex.FEMALE, Phase.BULK, new BigDecimal("32")), parameters(Sex.FEMALE));
        Reason ceiling = new Reason(new RuleId("bulk_ceiling"),
                new Source("arastirma/ham/guray/G6-eski-arsiv.md#K-7", SourceTag.EXPERIENCE));
        Reason offset = new Reason(new RuleId("female_fat_offset"),
                new Source("arastirma/ham/J1-cinsiyet.md#B1", SourceTag.LITERATURE));

        assertThat(man).hasValueSatisfying(d -> assertThat(d.reasons()).containsExactly(ceiling));
        assertThat(woman).hasValueSatisfying(d -> assertThat(d.reasons()).containsExactly(ceiling, offset));
    }

    @Test
    void aVisualEstimateIsMediumConfidenceWithAKeyPerRule() {
        Optional<Decision> decision = PhaseGate.check(snapshot(Sex.MALE, Phase.BULK, new BigDecimal("22")), parameters(Sex.MALE));

        assertThat(decision).hasValueSatisfying(d -> {
            assertThat(d.confidence()).isEqualTo(Confidence.MEDIUM);
            assertThat(d.nextReview()).isEqualTo(TODAY.plusDays(7));
            assertThat(d.copyKey()).isEqualTo(new CopyKey("decision.change_phase.bulk_ceiling"));
        });
    }

    @Test
    void everyCopyKeyItCanReturnHasATitleAndBodyInEnJson() {
        for (String rule : List.of("bulk_ceiling", "fat_first", "cut_floor_reached")) {
            assertThat(EngineFixtures.copyGroup(new CopyKey("decision.change_phase." + rule))).as(rule)
                    .hasEntrySatisfying("title", title -> assertThat(title).isInstanceOf(String.class))
                    .hasEntrySatisfying("body", body -> assertThat(body).isInstanceOf(String.class));
        }
    }

    // ── helpers ─────────────────────────────────────────────────────────────────────────────────────────────

    private static Snapshot snapshot(Sex sex, Phase phase, BigDecimal fatProxyPct) {
        return new Snapshot(TODAY, sex, phase, TODAY.minusDays(30), series(List.of()), Optional.of(fatProxyPct));
    }

    private static void assertChangesTo(Optional<Decision> decision, Phase to, String rule) {
        assertThat(decision).hasValueSatisfying(d -> {
            assertThat(d.action()).isEqualTo(new Action.ChangePhase(to));
            assertThat(d.reasons().getFirst().rule()).isEqualTo(new RuleId(rule));
        });
    }
}
