package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static app.keel.engine.EngineFixtures.series;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.constraints.IntRange;
import org.junit.jupiter.api.Test;

/**
 * Deload looks at the body, not the calendar (Güray G7 K-66). The ladder (G7 K-68): stalled → stop adding load that
 * week; still stalled after holding for a week → a lighter week (half the sets); three months at the same load off a
 * diet is a deload signal on its own (G7 K-69). Plateau = plateau_sessions without progress (H3 B5).
 */
class DeloadLadderTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 26);
    private static final Parameters P = parameters(Sex.MALE);
    private static final int PLATEAU = P.wholeNumber(ParameterKey.PLATEAU_SESSIONS);
    private static final int WEEK_OF_SESSIONS = P.wholeNumber(ParameterKey.FREQUENCY_PER_MUSCLE_PER_WEEK);
    private static final int STAGNATION_MONTHS = P.wholeNumber(ParameterKey.STAGNATION_DELOAD_MONTHS);

    // ── rung 1: stop adding load ────────────────────────────────────────────────────────────────────────────

    @Test
    void aPlateauStopsLoadIncreasesFirst() {
        // Spec WC-16: 3 stalled sessions on a compound → hold the load, nothing else yet.
        Optional<Decision> decision = DeloadLadder.check(new TrainingStatus(PLATEAU, false, 0), bulk(), P);

        assertThat(decision).hasValueSatisfying(d -> {
            assertThat(d.action()).isEqualTo(new Action.StopLoadIncrease());
            assertThat(d.reasons().getFirst()).isEqualTo(new Reason(new RuleId("plateau"),
                    new Source("arastirma/ham/guray/G7-whisper-arsiv.md#K-68", SourceTag.EXPERIENCE)));
        });
    }

    @Test
    void oneSessionShortOfAPlateauIsJustTraining() {
        assertThat(DeloadLadder.check(new TrainingStatus(PLATEAU - 1, false, 0), bulk(), P)).isNotPresent();
    }

    // ── rung 2: deload ──────────────────────────────────────────────────────────────────────────────────────

    @Test
    void stillStalledAfterHoldingForAWeekMeansALighterWeek() {
        // Spec WC-17: plateau (3) + one week of holding at 2 sessions a week = 5 stalled sessions → deload, half the sets.
        int stalled = PLATEAU + WEEK_OF_SESSIONS;
        BigDecimal half = BigDecimal.valueOf(P.number(ParameterKey.DELOAD_VOLUME_FACTOR));

        Optional<Decision> decision = DeloadLadder.check(new TrainingStatus(stalled, true, 0), bulk(), P);

        assertThat(decision).hasValueSatisfying(d -> {
            assertThat(d.action()).isEqualTo(new Action.Deload(half));
            assertThat(d.reasons().getFirst().rule()).isEqualTo(new RuleId("load_held_still_stalled"));
        });
    }

    @Test
    void holdingTheLoadGetsItsFullWeekBeforeADeload() {
        // Held, but the holding week is not over: keep holding, no new decision.
        int stalled = PLATEAU + WEEK_OF_SESSIONS - 1;

        assertThat(DeloadLadder.check(new TrainingStatus(stalled, true, 0), bulk(), P)).isNotPresent();
    }

    // ── three months without progress ───────────────────────────────────────────────────────────────────────

    @Test
    void threeMonthsWithoutProgressOffADietIsADeloadSignal() {
        // Spec WC-19, Güray G7 K-69.
        Optional<Decision> decision = DeloadLadder.check(new TrainingStatus(0, false, STAGNATION_MONTHS), bulk(), P);

        assertThat(decision).hasValueSatisfying(d -> {
            assertThat(d.action()).isInstanceOf(Action.Deload.class);
            assertThat(d.reasons().getFirst()).isEqualTo(new Reason(new RuleId("long_stagnation"),
                    new Source("arastirma/ham/guray/G7-whisper-arsiv.md#K-69", SourceTag.EXPERIENCE)));
        });
        assertThat(DeloadLadder.check(new TrainingStatus(0, false, STAGNATION_MONTHS - 1), bulk(), P)).isNotPresent();
    }

    @Test
    void onADietAStallIsNotALongStagnation() {
        // G7 K-69: the rule is for someone not dieting; on a cut, strength standing still is expected (G6 K-30).
        assertThat(DeloadLadder.check(new TrainingStatus(0, false, STAGNATION_MONTHS + 2), cut(), P)).isNotPresent();
    }

    // ── shape of the decision ───────────────────────────────────────────────────────────────────────────────

    @Test
    void ladderDecisionsAreMediumConfidenceAndLookAgainNextWeek() {
        Optional<Decision> decision = DeloadLadder.check(new TrainingStatus(PLATEAU, false, 0), bulk(), P);

        assertThat(decision).hasValueSatisfying(d -> {
            assertThat(d.confidence()).isEqualTo(Confidence.MEDIUM);
            assertThat(d.nextReview()).isEqualTo(TODAY.plusDays(7));
            assertThat(d.copyKey()).isEqualTo(new CopyKey("decision.stop_load_increase.plateau"));
        });
    }

    @Test
    void everyCopyKeyItCanReturnHasATitleAndBodyInEnJson() {
        for (String key : List.of("decision.stop_load_increase.plateau", "decision.deload.load_held_still_stalled",
                "decision.deload.long_stagnation")) {
            assertThat(EngineFixtures.copyGroup(new CopyKey(key))).as(key)
                    .hasEntrySatisfying("title", title -> assertThat(title).isInstanceOf(String.class))
                    .hasEntrySatisfying("body", body -> assertThat(body).isInstanceOf(String.class));
        }
    }

    @Test
    void refusesNegativeCounts() {
        assertThatThrownBy(() -> new TrainingStatus(-1, false, 0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new TrainingStatus(0, false, -1)).isInstanceOf(IllegalArgumentException.class);
    }

    // ── properties ──────────────────────────────────────────────────────────────────────────────────────────

    @Property
    boolean noDeloadComesFromTheCalendar(@ForAll @IntRange(min = 0, max = 400) int daysSinceAnything) {
        // G7 K-66: the calendar is never a reason. Without a stall or long stagnation, any date gives nothing.
        Snapshot anyDay = new Snapshot(TODAY.plusDays(daysSinceAnything), Sex.MALE, Phase.BULK,
                TODAY.minusDays(30), series(List.of()));
        return DeloadLadder.check(new TrainingStatus(0, false, 0), anyDay, P).isEmpty();
    }

    @Property
    boolean theLadderIsClimbedInOrder(@ForAll @IntRange(min = 0, max = 20) int stalled, @ForAll boolean held) {
        // Deload only after the load was held; a plateau without a hold only ever stops load increases.
        Optional<Decision> decision = DeloadLadder.check(new TrainingStatus(stalled, held, 0), bulk(), P);
        return decision.map(d -> held ? d.action() instanceof Action.Deload : d.action() instanceof Action.StopLoadIncrease)
                .orElse(true);
    }

    private static Snapshot bulk() {
        return new Snapshot(TODAY, Sex.MALE, Phase.BULK, TODAY.minusDays(30), series(List.of()));
    }

    private static Snapshot cut() {
        return new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(30), series(List.of()));
    }
}
