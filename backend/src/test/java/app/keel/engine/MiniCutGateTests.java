package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static app.keel.engine.EngineFixtures.series;
import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.CheckIn.Appetite;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/**
 * The mini cut (G7 K-102): a bulk of mini_cut_after_bulk_months or more whose appetite has gone — the user forces
 * food down — gets mini_cut_weeks_min to mini_cut_weeks_max of deficit; appetite comes back and the bulk resumes.
 */
class MiniCutGateTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 26);
    private static final Parameters MALE = parameters(Sex.MALE);
    private static final int AFTER_MONTHS = MALE.wholeNumber(ParameterKey.MINI_CUT_AFTER_BULK_MONTHS);

    @Test
    void aLongBulkWithoutAppetiteGetsAMiniCut() {
        // Spec WC-20.
        Optional<Decision> decision = MiniCutGate.check(bulkSince(TODAY.minusMonths(AFTER_MONTHS), Appetite.GONE), MALE);

        assertThat(decision).hasValueSatisfying(d -> {
            assertThat(d.action()).isEqualTo(new Action.MiniCut(MALE.wholeNumber(ParameterKey.MINI_CUT_WEEKS_MIN),
                    MALE.wholeNumber(ParameterKey.MINI_CUT_WEEKS_MAX)));
            assertThat(d.reasons()).containsExactly(new Reason(new RuleId("appetite_gone"),
                    new Source("arastirma/ham/guray/G7-whisper-arsiv.md#K-102", SourceTag.EXPERIENCE)));
            assertThat(d.copyKey()).isEqualTo(new CopyKey("decision.mini_cut.appetite_gone"));
            // Looked at again when the shortest mini cut is over, not after a week of it.
            assertThat(d.nextReview()).isEqualTo(TODAY.plusWeeks(MALE.wholeNumber(ParameterKey.MINI_CUT_WEEKS_MIN)));
        });
    }

    @Test
    void aShorterBulkKeepsGoing() {
        assertThat(MiniCutGate.check(bulkSince(TODAY.minusMonths(AFTER_MONTHS).plusDays(1), Appetite.GONE), MALE)).isEmpty();
    }

    @Test
    void appetiteThatIsFineOrUnknownIsNoReason() {
        assertThat(MiniCutGate.check(bulkSince(TODAY.minusMonths(AFTER_MONTHS + 1), Appetite.NORMAL), MALE)).isEmpty();
        assertThat(MiniCutGate.check(bulkSince(TODAY.minusMonths(AFTER_MONTHS + 1), Appetite.UNKNOWN), MALE)).isEmpty();
    }

    @Test
    void aCutNeverGetsAMiniCut() {
        Snapshot cut = new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(30), series(EngineFixtures.daily(TODAY.minusDays(30), TODAY, "80.0")))
                .withPhaseStart(TODAY.minusMonths(AFTER_MONTHS + 2)).withCheckIn(CheckIn.NONE.withAppetite(Appetite.GONE));

        assertThat(MiniCutGate.check(cut, MALE)).isEmpty();
    }

    @Test
    void everyCopyKeyItCanReturnHasATitleAndBodyInEnJson() {
        assertThat(EngineFixtures.copyGroup(new CopyKey("decision.mini_cut.appetite_gone")))
                .hasEntrySatisfying("title", title -> assertThat(title).isInstanceOf(String.class))
                .hasEntrySatisfying("body", body -> assertThat(body).isInstanceOf(String.class));
    }

    private static Snapshot bulkSince(LocalDate phaseStart, Appetite appetite) {
        return new Snapshot(TODAY, Sex.MALE, Phase.BULK, TODAY.minusDays(30), series(EngineFixtures.daily(TODAY.minusDays(30), TODAY, "70.0")))
                .withPhaseStart(phaseStart).withCheckIn(CheckIn.NONE.withAppetite(appetite));
    }

    // ── K-227: the mini cut on the plan ─────────────────────────────────────────────────────────────────────────────

    private static final int CUT_STEP = MALE.wholeNumber(ParameterKey.CUT_STEP_MIN_KCAL);

    /** A man cutting since today, 82 kg flat for three weeks, 30 years, 180 cm, with a fat estimate. */
    private static Snapshot onTheMiniCut(Optional<LocalDate> until) {
        Snapshot base = new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(21),
                EngineFixtures.series(EngineFixtures.daily(TODAY.minusDays(21), TODAY, "82.0")), Optional.of(new BigDecimal("18")))
                .withProfile(new Profile(30, 180)).withEnergy(EnergyBudget.exerciseUnknown(2600)).withPhaseStart(TODAY.minusDays(21));
        return until.map(base::withMiniCutUntil).orElse(base);
    }

    @Test
    void theMiniCutIsOverOnItsDayAndThePlanGoesBackToBuilding() {
        Optional<Decision> over = MiniCutGate.over(onTheMiniCut(Optional.of(TODAY)), MALE);

        assertThat(over).hasValueSatisfying(d -> {
            assertThat(d.action()).isEqualTo(new Action.ChangePhase(Phase.BULK));
            assertThat(d.reasons().getFirst().rule()).isEqualTo(MiniCutGate.MINI_CUT_OVER);
            assertThat(EngineFixtures.copyGroup(d.copyKey())).containsKeys("title", "body");
        });
        assertThat(MiniCutGate.over(onTheMiniCut(Optional.of(TODAY.plusDays(1))), MALE)).as("not yet").isEmpty();
        assertThat(MiniCutGate.over(onTheMiniCut(Optional.empty()), MALE)).as("an ordinary cut").isEmpty();
    }

    @Test
    void theDayComesFirstEvenWhileTheNewPlanIsWatchedOrTheWindowIsShort() {
        Snapshot watched = onTheMiniCut(Optional.of(TODAY)).withObservingMaintenance(true);

        assertThat(DecisionPipeline.decide(watched, MALE).action()).isEqualTo(new Action.ChangePhase(Phase.BULK));
    }

    @Test
    void theMiniCutTargetIsOneMinimumCutStepUnderMaintenance() {
        assertThat(MiniCutGate.target(onTheMiniCut(Optional.empty()), 2600, MALE)).isEqualTo(2600 - CUT_STEP);
    }

    @Test
    void underASafetyFloorTheMiniCutStaysAtMaintenance() {
        // Under the resting energy (Mifflin at 82 kg, 30 y, 180 cm ≈ 1800): one step from 2100 would be 1600.
        assertThat(MiniCutGate.target(onTheMiniCut(Optional.empty()), 2100, MALE)).isEqualTo(2100);
    }

    @Test
    void aWomanWithoutAFatEstimateGetsNoStepDown() {
        // ADR-027 #11b: without the estimate her low-energy floor cannot be computed; no step down.
        Snapshot her = new Snapshot(TODAY, Sex.FEMALE, Phase.CUT, TODAY.minusDays(21),
                EngineFixtures.series(EngineFixtures.daily(TODAY.minusDays(21), TODAY, "62.0")))
                .withProfile(new Profile(30, 165)).withEnergy(EnergyBudget.exerciseUnknown(2300)).withPhaseStart(TODAY.minusDays(21));

        assertThat(MiniCutGate.target(her, 2300, parameters(Sex.FEMALE))).isEqualTo(2300);
    }
}
