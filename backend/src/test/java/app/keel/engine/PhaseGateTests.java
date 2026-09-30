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
    void aCutBelowTheSurplusLineTurnsIntoABulk(Sex sex) {
        // 03 §2.1: under 12 % (a woman 22 %) the direction is surplus.
        BigDecimal justBelow = band(sex, ParameterKey.SURPLUS_BELOW_FAT_PROXY_PCT).subtract(STEP);

        assertChangesTo(PhaseGate.check(snapshot(sex, Phase.CUT, justBelow), parameters(sex)), Phase.BULK, "surplus_zone");
    }

    @ParameterizedTest
    @EnumSource(Sex.class)
    void aCutAtOrAboveTheSurplusLineIsTheUsersChoice(Sex sex) {
        // 12-25 %: "by goal and preference" (03 §2.1); someone who wants to look drier may keep cutting (G6 K-8).
        BigDecimal line = band(sex, ParameterKey.SURPLUS_BELOW_FAT_PROXY_PCT);

        assertThat(PhaseGate.check(snapshot(sex, Phase.CUT, line), parameters(sex))).isNotPresent();
        assertThat(PhaseGate.check(snapshot(sex, Phase.CUT, line.add(new BigDecimal("3"))), parameters(sex))).isNotPresent();
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
    void eachRuleNamesItsOwnResearch() {
        assertThat(PhaseGate.check(snapshot(Sex.MALE, Phase.BULK, new BigDecimal("30")), parameters(Sex.MALE)))
                .hasValueSatisfying(d -> assertThat(d.reasons().getFirst()).isEqualTo(new Reason(new RuleId("fat_first"),
                        new Source("arastirma/ham/guray/G4-ilerleme-metabolik.md#K-10", SourceTag.EXPERIENCE))));
        assertThat(PhaseGate.check(snapshot(Sex.MALE, Phase.CUT, new BigDecimal("10")), parameters(Sex.MALE)))
                .hasValueSatisfying(d -> assertThat(d.reasons().getFirst()).isEqualTo(new Reason(new RuleId("surplus_zone"),
                        new Source("arastirma/03-guray-karar-omurgasi.md#2.1", SourceTag.EXPERIENCE))));
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
        for (String rule : List.of("bulk_ceiling", "fat_first", "surplus_zone")) {
            assertThat(EngineFixtures.copyGroup(new CopyKey("decision.change_phase." + rule))).as(rule)
                    .hasEntrySatisfying("title", title -> assertThat(title).isInstanceOf(String.class))
                    .hasEntrySatisfying("body", body -> assertThat(body).isInstanceOf(String.class));
        }
    }

    // ── helpers ─────────────────────────────────────────────────────────────────────────────────────────────

    // ── two estimates (K-224 review) ────────────────────────────────────────────────────────────────────────

    @ParameterizedTest
    @EnumSource(Sex.class)
    void aBulkReadsTheHigherOfTwoEstimates(Sex sex) {
        // A look picked lean and a waist that says more (ADR-027 #11 "the cautious one"): a bulk stops on the higher. G4
        // K-10: above the fat-first line a bulk is never kept.
        BigDecimal lean = band(sex, ParameterKey.SURPLUS_BELOW_FAT_PROXY_PCT).add(STEP);
        BigDecimal overFatFirst = band(sex, ParameterKey.FAT_FIRST_FAT_PROXY_PCT).add(STEP);
        BigDecimal overCeiling = band(sex, ParameterKey.BULK_CEILING_FAT_PROXY_PCT).add(STEP);

        assertChangesTo(PhaseGate.check(snapshot(sex, Phase.BULK, lean).withFatProxy(lean, overFatFirst), parameters(sex)), Phase.CUT, "fat_first");
        assertChangesTo(PhaseGate.check(snapshot(sex, Phase.BULK, lean).withFatProxy(lean, overCeiling), parameters(sex)), Phase.CUT, "bulk_ceiling");
    }

    @ParameterizedTest
    @EnumSource(Sex.class)
    void aCutReadsTheLowerOfTwoEstimates(Sex sex) {
        // Turning to a bulk is the protective call for the lean body, so a cut reads the lower.
        BigDecimal underSurplus = band(sex, ParameterKey.SURPLUS_BELOW_FAT_PROXY_PCT).subtract(STEP);
        BigDecimal high = band(sex, ParameterKey.FAT_FIRST_FAT_PROXY_PCT).add(STEP);

        assertChangesTo(PhaseGate.check(snapshot(sex, Phase.CUT, high).withFatProxy(underSurplus, high), parameters(sex)), Phase.BULK, "surplus_zone");
    }

    // ── the first direction, left to the engine (ADR-027 #17) ─────────────────────────────────────────────────

    @ParameterizedTest
    @EnumSource(Sex.class)
    void leftToTheEngineALeanBodyBuildsAndAnyOtherCuts(Sex sex) {
        BigDecimal underSurplus = band(sex, ParameterKey.SURPLUS_BELOW_FAT_PROXY_PCT).subtract(STEP);
        BigDecimal surplus = band(sex, ParameterKey.SURPLUS_BELOW_FAT_PROXY_PCT);
        BigDecimal ceiling = band(sex, ParameterKey.BULK_CEILING_FAT_PROXY_PCT);

        assertThat(PhaseGate.startingPhase(Optional.of(underSurplus), Optional.of(underSurplus), parameters(sex))).isEqualTo(Phase.BULK);
        assertThat(PhaseGate.startingPhase(Optional.of(underSurplus), Optional.of(ceiling), parameters(sex))).as("the higher at the ceiling")
                .isEqualTo(Phase.BULK);
        assertThat(PhaseGate.startingPhase(Optional.of(underSurplus), Optional.of(ceiling.add(STEP)), parameters(sex)))
                .as("the higher would stop the build at once").isEqualTo(Phase.CUT);
        assertThat(PhaseGate.startingPhase(Optional.of(surplus), Optional.of(surplus), parameters(sex))).as("on the line").isEqualTo(Phase.CUT);
        assertThat(PhaseGate.startingPhase(Optional.empty(), Optional.empty(), parameters(sex))).as("no estimate: G4 K-4").isEqualTo(Phase.CUT);
    }

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
