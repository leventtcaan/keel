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
            assertThat(d.nextReview()).isEqualTo(TODAY.plusDays(7));
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
}
