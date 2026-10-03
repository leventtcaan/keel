package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static app.keel.engine.EngineFixtures.series;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import net.jqwik.api.constraints.IntRange;
import org.junit.jupiter.api.Test;

/**
 * Deload looks at the body, not the calendar (coaching experience, G7 K-66). The ladder (G7 K-68): stalled → stop adding load that
 * week; still stalled after holding for a week → a lighter week (half the sets); three months at the same load off a
 * diet is a deload signal on its own (G7 K-69). Plateau = plateau_sessions without progress (H3 B5). Rung 3 is two
 * signals (ADR-020 L-12): last week's loads no longer go up → food and sleep, one by one (G7 K-68); the plan could not
 * be followed overtraining_missed_plan_weeks in a row → one full week off (G7 K-70/K-73).
 */
class DeloadLadderTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 26);
    private static final Parameters P = parameters(Sex.MALE);
    private static final int PLATEAU = P.wholeNumber(ParameterKey.PLATEAU_SESSIONS);
    private static final int STAGNATION_MONTHS = P.wholeNumber(ParameterKey.STAGNATION_DELOAD_MONTHS);
    private static final int MISSED_WEEKS = P.wholeNumber(ParameterKey.OVERTRAINING_MISSED_PLAN_WEEKS);

    // ── rung 1: stop adding load ────────────────────────────────────────────────────────────────────────────

    @Test
    void aPlateauStopsLoadIncreasesFirst() {
        // Spec WC-16: 3 stalled sessions on a compound → hold the load, nothing else yet.
        Optional<Decision> decision = DeloadLadder.check(stalled(PLATEAU, 0, 0), bulk(), P);

        assertThat(decision).hasValueSatisfying(d -> {
            assertThat(d.action()).isEqualTo(new Action.StopLoadIncrease());
            assertThat(d.reasons().getFirst()).isEqualTo(new Reason(new RuleId("plateau"),
                    new Source("arastirma/ham/guray/G7-whisper-arsiv.md#K-68", SourceTag.EXPERIENCE)));
        });
    }

    @Test
    void oneSessionShortOfAPlateauIsJustTraining() {
        assertThat(DeloadLadder.check(stalled(PLATEAU - 1, 0, 0), bulk(), P)).isNotPresent();
    }

    @Test
    void whileTheFirstWeekOfHoldingRunsTheAnswerStaysHold() {
        // "That week" (K-68) is one weekly review, however often the lift is trained.
        assertThat(DeloadLadder.check(stalled(PLATEAU + 1, 0, 0), bulk(), P)).hasValueSatisfying(
                d -> assertThat(d.action()).isEqualTo(new Action.StopLoadIncrease()));
    }

    // ── rung 2: deload ──────────────────────────────────────────────────────────────────────────────────────

    @Test
    void stillStalledAfterAWeekOfHoldingMeansALighterWeek() {
        // Spec WC-17: held for a week, still stalled → deload, sets scaled by deload_volume_factor.
        BigDecimal factor = BigDecimal.valueOf(P.number(ParameterKey.DELOAD_VOLUME_FACTOR));

        Optional<Decision> decision = DeloadLadder.check(stalled(PLATEAU + 2, 1, 0), bulk(), P);

        assertThat(decision).hasValueSatisfying(d -> {
            assertThat(d.action()).isEqualTo(new Action.Deload(factor));
            assertThat(d.reasons().getFirst().rule()).isEqualTo(new RuleId("load_held_still_stalled"));
        });
    }

    @Test
    void theWeekAfterADeloadIsNeverAnotherDeload() {
        // G7 K-72: after the break, return slowly. The deload week cannot add load, so the counters still look
        // stalled; without this the engine would order a deload every week.
        assertThat(DeloadLadder.check(new TrainingStatus(PLATEAU + 4, 2, STAGNATION_MONTHS + 1, true), bulk(), P))
                .isNotPresent();
    }

    // ── rung 3: two signals (ADR-020 L-12) ──────────────────────────────────────────────────────────────────

    @Test
    void thePlanMissedTwoWeeksRunningMeansAFullWeekOff() {
        // Spec WC-18, G7 K-73: can't do the planned sessions as planned → overtraining; K-70: a light week won't hold,
        // a full week away will.
        Optional<Decision> decision = DeloadLadder.check(stalled(0, 0, 0).withWeeksPlanMissed(MISSED_WEEKS), bulk(), P);

        assertThat(decision).hasValueSatisfying(d -> {
            assertThat(d.action()).isEqualTo(new Action.FullRestWeek());
            assertThat(d.reasons()).containsExactly(
                    new Reason(new RuleId("plan_missed"), new Source("arastirma/ham/guray/G7-whisper-arsiv.md#K-73", SourceTag.EXPERIENCE)),
                    new Reason(new RuleId("full_rest_week"), new Source("arastirma/ham/guray/G7-whisper-arsiv.md#K-70", SourceTag.EXPERIENCE)));
            assertThat(d.copyKey()).isEqualTo(new CopyKey("decision.full_rest_week.plan_missed"));
        });
    }

    @Test
    void oneMissedWeekIsNotYetOvertraining() {
        assertThat(DeloadLadder.check(stalled(0, 0, 0).withWeeksPlanMissed(MISSED_WEEKS - 1), bulk(), P)).isNotPresent();
    }

    @Test
    void theFullWeekOffOutranksEveryOtherRung() {
        TrainingStatus everything = stalled(PLATEAU + 5, 2, STAGNATION_MONTHS).withLoadsBelowLastWeek(true)
                .withWeeksPlanMissed(MISSED_WEEKS);

        assertThat(DeloadLadder.check(everything, bulk(), P)).hasValueSatisfying(
                d -> assertThat(d.action()).isEqualTo(new Action.FullRestWeek()));
    }

    @Test
    void goingBackwardsIsAboutFoodAndSleepNotADeload() {
        // G7 K-68 rung 3: "if even last week's weights don't go up … check food and everything else one by one".
        Optional<Decision> decision = DeloadLadder.check(stalled(PLATEAU + 2, 1, 0).withLoadsBelowLastWeek(true), bulk(), P);

        assertThat(decision).hasValueSatisfying(d -> {
            assertThat(d.action()).isEqualTo(new Action.FixRecovery());
            assertThat(d.reasons()).containsExactly(new Reason(new RuleId("loads_regressed"),
                    new Source("arastirma/ham/guray/G7-whisper-arsiv.md#K-68", SourceTag.EXPERIENCE)));
            assertThat(d.copyKey()).isEqualTo(new CopyKey("decision.fix_recovery.loads_regressed"));
        });
    }

    @Test
    void goingBackwardsCountsWithoutAPlateauToo() {
        // Losing last week's loads is a signal of its own; it does not wait for plateau_sessions.
        assertThat(DeloadLadder.check(stalled(0, 0, 0).withLoadsBelowLastWeek(true), bulk(), P)).hasValueSatisfying(
                d -> assertThat(d.action()).isEqualTo(new Action.FixRecovery()));
    }

    @Test
    void onACutGoingBackwardsIsNotSentToFoodAndSleep() {
        // G6 K-30: strength dropping on a diet is expected; G2's decision table makes it the cut's red flag (no calorie
        // cut), which the weekly spine owns (K-106). "Check how you ate" would push against the cut the engine set.
        assertThat(DeloadLadder.check(stalled(0, 0, 0).withLoadsBelowLastWeek(true), cut(), P)).isNotPresent();
    }

    @Test
    void goingBackwardsOutranksLongStagnation() {
        TrainingStatus both = stalled(PLATEAU, 0, STAGNATION_MONTHS).withLoadsBelowLastWeek(true);

        assertThat(DeloadLadder.check(both, bulk(), P)).hasValueSatisfying(
                d -> assertThat(d.action()).isEqualTo(new Action.FixRecovery()));
    }

    @Test
    void theWeekAfterARestIsNotAnotherRest() {
        // G7 K-72 covers the full week off as well: come back gradually.
        TrainingStatus afterRest = new TrainingStatus(0, 0, 0, true, false, MISSED_WEEKS + 1);

        assertThat(DeloadLadder.check(afterRest, bulk(), P)).isNotPresent();
    }

    // ── three months without progress ───────────────────────────────────────────────────────────────────────

    @Test
    void threeMonthsStuckOffADietIsADeloadOnItsOwn() {
        // Spec WC-19, coaching experience, G7 K-69: a signal "on its own", so it goes straight to a lighter week, skipping rung 1.
        Optional<Decision> decision = DeloadLadder.check(stalled(PLATEAU, 0, STAGNATION_MONTHS), bulk(), P);

        assertThat(decision).hasValueSatisfying(d -> {
            assertThat(d.action()).isInstanceOf(Action.Deload.class);
            assertThat(d.reasons().getFirst()).isEqualTo(new Reason(new RuleId("long_stagnation"),
                    new Source("arastirma/ham/guray/G7-whisper-arsiv.md#K-69", SourceTag.EXPERIENCE)));
        });
        assertThat(DeloadLadder.check(stalled(PLATEAU, 0, STAGNATION_MONTHS - 1), bulk(), P)).hasValueSatisfying(
                d -> assertThat(d.action()).isEqualTo(new Action.StopLoadIncrease()));
    }

    @Test
    void onADietLongStagnationIsNotTheReason() {
        // G7 K-69 is for someone not dieting; on a cut, strength standing still is expected (G6 K-30).
        assertThat(DeloadLadder.check(stalled(PLATEAU, 0, STAGNATION_MONTHS + 2), cut(), P)).hasValueSatisfying(
                d -> assertThat(d.reasons().getFirst().rule()).isNotEqualTo(new RuleId("long_stagnation")));
    }

    // ── shape of the decision and the input ─────────────────────────────────────────────────────────────────

    @Test
    void ladderDecisionsAreMediumConfidenceAndLookAgainNextWeek() {
        Optional<Decision> decision = DeloadLadder.check(stalled(PLATEAU, 0, 0), bulk(), P);

        assertThat(decision).hasValueSatisfying(d -> {
            assertThat(d.confidence()).isEqualTo(Confidence.MEDIUM);
            assertThat(d.nextReview()).isEqualTo(TODAY.plusDays(7));
            assertThat(d.copyKey()).isEqualTo(new CopyKey("decision.stop_load_increase.plateau"));
        });
    }

    @Test
    void everyCopyKeyItCanReturnHasATitleAndBodyInEnJson() {
        for (String key : List.of("decision.stop_load_increase.plateau", "decision.deload.load_held_still_stalled",
                "decision.deload.long_stagnation", "decision.full_rest_week.plan_missed",
                "decision.fix_recovery.loads_regressed")) {
            assertThat(EngineFixtures.copyGroup(new CopyKey(key))).as(key)
                    .hasEntrySatisfying("title", title -> assertThat(title).isInstanceOf(String.class))
                    .hasEntrySatisfying("body", body -> assertThat(body).isInstanceOf(String.class));
        }
    }

    @Test
    void refusesContradictoryOrNegativeCounts() {
        assertThatThrownBy(() -> new TrainingStatus(-1, 0, 0, false)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new TrainingStatus(0, -1, 0, false)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new TrainingStatus(0, 0, -1, false)).isInstanceOf(IllegalArgumentException.class);
        // Months stalled are months of the same stalled lift: not possible with no stalled session.
        assertThatThrownBy(() -> new TrainingStatus(0, 0, 3, false)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new TrainingStatus(0, 0, 0, false, false, -1)).isInstanceOf(IllegalArgumentException.class);
    }

    // ── properties ──────────────────────────────────────────────────────────────────────────────────────────

    @Property
    boolean theCalendarNeverChangesTheAnswer(@ForAll("statuses") TrainingStatus status,
            @ForAll @IntRange(min = 0, max = 400) int daysLater) {
        // G7 K-66: moving "today" and the plan start by any number of days changes nothing but the review date.
        Snapshot now = bulk();
        Snapshot later = new Snapshot(TODAY.plusDays(daysLater), Sex.MALE, Phase.BULK, TODAY.minusDays(30).plusDays(daysLater),
                series(List.of()));
        return DeloadLadder.check(status, now, P).map(Decision::action)
                .equals(DeloadLadder.check(status, later, P).map(Decision::action));
    }

    @Property
    boolean aRestIsNeverFollowedByAnyLadderCall(@ForAll("statuses") TrainingStatus status) {
        TrainingStatus afterRest = new TrainingStatus(status.stalledSessions(), status.weeksLoadHeld(),
                status.monthsStalled(), true, status.loadsBelowLastWeek(), status.weeksPlanMissed());
        return DeloadLadder.check(afterRest, bulk(), P).isEmpty();
    }

    @Property
    boolean foodAndSleepExactlyWhenGoingBackwardsOffACutWithoutOvertraining(@ForAll("statuses") TrainingStatus status) {
        boolean recovery = DeloadLadder.check(status, bulk(), P)
                .map(d -> d.action() instanceof Action.FixRecovery).orElse(false);
        return recovery == (status.loadsBelowLastWeek() && status.weeksPlanMissed() < MISSED_WEEKS && !status.restedLastWeek());
    }

    @Property
    boolean aFullWeekOffOnlyAfterThePlanFailedLongEnough(@ForAll("statuses") TrainingStatus status,
            @ForAll @IntRange(min = 0, max = 6) int missed, @ForAll boolean below) {
        Optional<Decision> decision = DeloadLadder.check(status.withLoadsBelowLastWeek(below).withWeeksPlanMissed(missed), bulk(), P);
        boolean rest = decision.map(d -> d.action() instanceof Action.FullRestWeek).orElse(false);
        return rest == (missed >= MISSED_WEEKS && !status.restedLastWeek());
    }

    @Property
    boolean theStallRungsAreClimbedInOrder(@ForAll("statuses") TrainingStatus status) {
        // Without long stagnation: a deload only after a completed week of holding, a hold only on a plateau.
        Optional<Decision> decision = DeloadLadder.check(
                new TrainingStatus(status.stalledSessions(), status.weeksLoadHeld(), 0, false), bulk(), P);
        return decision.map(d -> status.weeksLoadHeld() >= 1
                ? d.action() instanceof Action.Deload
                : d.action() instanceof Action.StopLoadIncrease).orElse(true);
    }

    @Provide
    Arbitrary<TrainingStatus> statuses() {
        return Arbitraries.integers().between(0, 20).flatMap(stalled -> Combinators.combine(
                Arbitraries.integers().between(0, 4),
                stalled == 0 ? Arbitraries.just(0) : Arbitraries.integers().between(0, 8),
                Arbitraries.of(true, false),
                Arbitraries.of(true, false),
                Arbitraries.integers().between(0, 4))
                .as((held, months, rested, below, missed) -> new TrainingStatus(stalled, held, months, rested, below, missed)));
    }

    private static TrainingStatus stalled(int sessions, int weeksHeld, int months) {
        return new TrainingStatus(sessions, weeksHeld, months, false);
    }

    private static Snapshot bulk() {
        return new Snapshot(TODAY, Sex.MALE, Phase.BULK, TODAY.minusDays(30), series(List.of()));
    }

    private static Snapshot cut() {
        return new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(30), series(List.of()));
    }
}
