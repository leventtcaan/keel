package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.BodyRegion;
import app.keel.engine.LiftKind;
import app.keel.engine.LiftSession;
import app.keel.engine.RepositoryParameters;
import app.keel.engine.Sex;
import app.keel.engine.Progression;
import app.keel.engine.ProgressionStep;
import app.keel.engine.Reason;
import app.keel.engine.RepRange;
import app.keel.engine.RuleId;
import app.keel.engine.SetResult;
import app.keel.engine.Source;
import app.keel.engine.SourceTag;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * The next session's load and reps after a workout (K-217, K-109 double progression): what the engine's step means on
 * the program, and the session it is read from — the work sets at the day's top load.
 */
class NextTargetsTests {

    private static final RepRange SIX_TO_TEN = new RepRange(6, 10);
    /** A fixed rep target (K-991): 5 x 5, min = max. */
    private static final RepRange FIVE_BY_FIVE = new RepRange(5, 5);
    /** The reps the onboarding asks a starting weight for (onboarding.json › starting_weight_reps). */
    private static final int ASKED_REPS = 8;
    private static final LiftSession BENCH = new LiftSession(LiftKind.COMPOUND, BodyRegion.UPPER, SIX_TO_TEN, new BigDecimal("80"),
            List.of(new SetResult(8, 2), new SetResult(7, 1), new SetResult(7, 1)), true);

    @Test
    void anAddedLoadStartsAgainFromTheBottomOfTheRange() {
        assertThat(NextTargets.after(BENCH, step(new ProgressionStep.AddLoad(new BigDecimal("82.5"), 6)), false, 1))
                .contains(new NextTargets.Target(new BigDecimal("82.5"), 6));
    }

    @Test
    void whileTheLoadIsHeldTheTopOfTheRangeIsTheTarget() {
        // First rung of the deload ladder (K-110): no load added; the reps stay at the top.
        assertThat(NextTargets.after(BENCH, step(new ProgressionStep.AddLoad(new BigDecimal("82.5"), 6)), true, 1))
                .contains(new NextTargets.Target(new BigDecimal("80"), 10));
    }

    @Test
    void addingRepsAimsOneAboveTheWeakestSetWithinTheRange() {
        assertThat(NextTargets.after(BENCH, step(new ProgressionStep.AddReps()), false, 1)).contains(new NextTargets.Target(new BigDecimal("80"), 8));
        LiftSession nearTop = new LiftSession(LiftKind.COMPOUND, BodyRegion.UPPER, SIX_TO_TEN, new BigDecimal("80"),
                List.of(new SetResult(10, 1), new SetResult(10, 0), new SetResult(9, 0)), true);
        assertThat(NextTargets.after(nearTop, step(new ProgressionStep.AddReps()), false, 1)).contains(new NextTargets.Target(new BigDecimal("80"), 10));
        // The engine adds load, not reps, once every set is at the top; the target still never leaves the range.
        LiftSession atTop = new LiftSession(LiftKind.COMPOUND, BodyRegion.UPPER, SIX_TO_TEN, new BigDecimal("80"),
                List.of(new SetResult(10, 1), new SetResult(10, 0)), true);
        assertThat(NextTargets.after(atTop, step(new ProgressionStep.AddReps()), false, 1)).contains(new NextTargets.Target(new BigDecimal("80"), 10));
    }

    @Test
    void aHeldSessionIsRepeatedAndAnUntrackedLiftHasNoTarget() {
        // Unclean form (G6 K-31): the same again, never under the range. Isolation lifts are not load-tracked (G6 K-33).
        LiftSession short_ = new LiftSession(LiftKind.COMPOUND, BodyRegion.UPPER, SIX_TO_TEN, new BigDecimal("80"),
                List.of(new SetResult(5, 0)), false);
        assertThat(NextTargets.after(BENCH, step(new ProgressionStep.Hold()), false, 1)).contains(new NextTargets.Target(new BigDecimal("80"), 7));
        assertThat(NextTargets.after(short_, step(new ProgressionStep.Hold()), false, 1)).contains(new NextTargets.Target(new BigDecimal("80"), 6));
        assertThat(NextTargets.after(BENCH, step(new ProgressionStep.NotTracked()), false, 1)).isEmpty();
    }

    @Test
    void fewerSetsAtTheTopLoadThanPlannedAddNoLoad() {
        // Planned 3 sets; the third dropped to a lighter load: two at the top are not "every set" (K-217 review).
        LiftSession twoOfThree = new LiftSession(LiftKind.COMPOUND, BodyRegion.UPPER, SIX_TO_TEN, new BigDecimal("60"),
                List.of(new SetResult(10, 1), new SetResult(10, 1)), true);

        assertThat(NextTargets.after(twoOfThree, step(new ProgressionStep.AddLoad(new BigDecimal("62.5"), 6)), false, 3))
                .contains(new NextTargets.Target(new BigDecimal("60"), 10));
        assertThat(NextTargets.after(twoOfThree, step(new ProgressionStep.AddLoad(new BigDecimal("62.5"), 6)), false, 2)).as("a lighter week of two")
                .contains(new NextTargets.Target(new BigDecimal("62.5"), 6));
    }

    @Test
    void aHoldBegunAfterTheTargetWasSetStillHoldsIt() {
        // The target is kept as the engine gave it; the hold is read when the program is shown (K-217 review: a hold
        // begun at Monday's check-in must cover the session Sunday's workout set up).
        NextTargets.Target added = new NextTargets.Target(new BigDecimal("62.5"), 6);

        assertThat(NextTargets.shown(added, new BigDecimal("60"), SIX_TO_TEN, true)).isEqualTo(new NextTargets.Target(new BigDecimal("60"), 10));
        assertThat(NextTargets.shown(added, new BigDecimal("60"), SIX_TO_TEN, false)).isEqualTo(added);
        NextTargets.Target reps = new NextTargets.Target(new BigDecimal("60"), 8);
        assertThat(NextTargets.shown(reps, new BigDecimal("60"), SIX_TO_TEN, true)).as("no load added: nothing to hold").isEqualTo(reps);
    }

    @Test
    void aOneSidedMoveFollowsItsWeakerSide() {
        // Each side is its own set (SetRules); the side that did less decides, so the other never jumps past it.
        assertThat(NextTargets.weaker(List.of(new NextTargets.Target(new BigDecimal("22.5"), 8), new NextTargets.Target(new BigDecimal("17.5"), 11))))
                .contains(new NextTargets.Target(new BigDecimal("17.5"), 11));
        assertThat(NextTargets.weaker(List.of(new NextTargets.Target(new BigDecimal("20"), 10), new NextTargets.Target(new BigDecimal("20"), 9))))
                .contains(new NextTargets.Target(new BigDecimal("20"), 9));
        assertThat(NextTargets.weaker(List.of())).isEmpty();
    }

    @Test
    void aStartingWeightIsTheFirstTargetAsTheGymCanMakeItFromTheBottomOfTheRange() {
        // ADR-072 #5: the load the user gave, rounded to the nearest the gym in use makes (ADR-032), where a new load starts.
        GymStore.Gym gym = new GymStore.Gym(null, "Test", true, new BigDecimal("20"), List.of(new BigDecimal("10"), new BigDecimal("5"),
                new BigDecimal("2.5")), List.of(new BigDecimal("18"), new BigDecimal("20"), new BigDecimal("22")), null, java.util.Map.of());

        assertThat(NextTargets.starting(new BigDecimal("81"), ASKED_REPS, SIX_TO_TEN, ExerciseCatalog.Equipment.BARBELL, "bench_press",
                java.util.Optional.of(gym))).contains(new NextTargets.Target(new BigDecimal("80"), 6));
        assertThat(NextTargets.starting(new BigDecimal("12"), ASKED_REPS, SIX_TO_TEN, ExerciseCatalog.Equipment.BARBELL, "bench_press",
                java.util.Optional.of(gym))).as("lighter than the bar: the bar").contains(new NextTargets.Target(new BigDecimal("20"), 6));
        assertThat(NextTargets.starting(new BigDecimal("21"), ASKED_REPS, new RepRange(8, 12), ExerciseCatalog.Equipment.DUMBBELL,
                "one_arm_dumbbell_row", java.util.Optional.of(gym))).as("a tie goes to the lighter").contains(new NextTargets.Target(new BigDecimal("20"), 8));
    }

    @Test
    void withoutAGymOrWordOnTheEquipmentTheStartingWeightIsAsGiven() {
        GymStore.Gym noBar = new GymStore.Gym(null, "Test", true, null, List.of(), List.of(), null, java.util.Map.of());

        assertThat(NextTargets.starting(new BigDecimal("81.25"), ASKED_REPS, SIX_TO_TEN, ExerciseCatalog.Equipment.BARBELL, "bench_press",
                java.util.Optional.empty())).contains(new NextTargets.Target(new BigDecimal("81.25"), 6));
        assertThat(NextTargets.starting(new BigDecimal("81.25"), ASKED_REPS, SIX_TO_TEN, ExerciseCatalog.Equipment.BARBELL, "bench_press",
                java.util.Optional.of(noBar))).contains(new NextTargets.Target(new BigDecimal("81.25"), 6));
    }

    @Test
    void aStartingWeightIsATargetOnlyWhereTheRangeStartsAtTheRepsItWasGivenFor() {
        // The load lifted about 8 times is no target for a 10-12 day: too heavy for the bottom of that range. That day finds
        // the load in its first session, as a move left out does (ADR-072 #5); nothing is derived for it.
        assertThat(NextTargets.starting(new BigDecimal("80"), ASKED_REPS, new RepRange(ASKED_REPS, 12), ExerciseCatalog.Equipment.BARBELL,
                "bench_press", java.util.Optional.empty())).contains(new NextTargets.Target(new BigDecimal("80"), ASKED_REPS));
        assertThat(NextTargets.starting(new BigDecimal("80"), ASKED_REPS, new RepRange(ASKED_REPS + 1, 12), ExerciseCatalog.Equipment.BARBELL,
                "bench_press", java.util.Optional.empty())).isEmpty();
    }

    @Test
    void aStartingWeightWasNeverLiftedSoAHoldHasNothingToHoldItTo() {
        // No session behind it, no load it came from: shown as given, a deload hold or not.
        NextTargets.Target start = new NextTargets.Target(new BigDecimal("80"), 6);

        assertThat(NextTargets.shown(start, null, SIX_TO_TEN, true)).isEqualTo(start);
        assertThat(NextTargets.shown(start, null, SIX_TO_TEN, false)).isEqualTo(start);
    }

    @Test
    void theSessionIsTheWorkSetsAtTheDaysTopLoad() {
        // Two sets at 80, a back-off at 70: the top load and its sets; a set without RIR reads as the planned RIR.
        List<TrainingLog.WorkSet> sets = List.of(set("80", 8, 2), set("80", 7, null), set("70", 10, 3));

        assertThat(NextTargets.session(LiftKind.COMPOUND, BodyRegion.UPPER, SIX_TO_TEN, sets, 1, true)).contains(new LiftSession(LiftKind.COMPOUND,
                BodyRegion.UPPER, SIX_TO_TEN, new BigDecimal("80"), List.of(new SetResult(8, 2), new SetResult(7, 1)), true));
        assertThat(NextTargets.session(LiftKind.COMPOUND, BodyRegion.UPPER, SIX_TO_TEN, List.of(set("0", 12, 1)), 1, true))
                .as("no load to progress: a bodyweight move without added load").isEmpty();
        assertThat(NextTargets.session(LiftKind.COMPOUND, BodyRegion.UPPER, SIX_TO_TEN, List.of(), 1, true)).isEmpty();
    }

    @Test
    void aFirstSessionsCalibratedLoadBecomesTheTarget() {
        // K-960 (ADR-075 #3, G6 K-40): no target yet; the sets with 2+ reps left (an old 3+ among them) took the next set a
        // step heavier. The load found is the day's top: the next session starts there, the light sets before it unread.
        List<TrainingLog.WorkSet> sets = List.of(set("40", 10, 3), set("40", 10, 2), set("42.5", 9, 1), set("42.5", 8, 0));
        LiftSession found = NextTargets.session(LiftKind.COMPOUND, BodyRegion.UPPER, SIX_TO_TEN, sets, 1, true).orElseThrow();

        assertThat(found.loadKg()).isEqualByComparingTo("42.5");
        assertThat(NextTargets.after(found, Progression.next(found, RepositoryParameters.forSex(Sex.MALE)), false, 2))
                .contains(new NextTargets.Target(new BigDecimal("42.5"), 9));
    }

    @ParameterizedTest(name = "{0}")
    @CsvSource(delimiter = '|', value = {
        "every set at the reps: one load step, the same reps | 5 5 5 5 5 | true  | 82.5 | 5",
        "a set past the reps counts as at them               | 6 5 5 5 5 | true  | 82.5 | 5",
        "one set short: the same load, the fixed reps again  | 5 5 5 5 4 | true  | 80   | 5",
        "far short: no rep step, still the fixed reps        | 5 5 5 4 3 | true  | 80   | 5",
        "unclean form: held at the fixed reps (G6 K-31)      | 5 5 5 5 5 | false | 80   | 5"})
    void aFixedRepTargetOnlyEverAddsLoad(String name, String reps, boolean clean, String kg, int expectedReps) {
        // K-991: double progression with one rung (H3 B4) — the engine adds the load when every work set reaches the reps,
        // otherwise the same load for the same reps; never a rep target under the fixed reps (no rep step to climb).
        LiftSession bench = new LiftSession(LiftKind.COMPOUND, BodyRegion.UPPER, FIVE_BY_FIVE, new BigDecimal("80"),
                Arrays.stream(reps.split(" ")).map(r -> new SetResult(Integer.parseInt(r), 1)).toList(), clean);

        assertThat(NextTargets.after(bench, Progression.next(bench, RepositoryParameters.forSex(Sex.MALE)), false, 5))
                .contains(new NextTargets.Target(new BigDecimal(kg), expectedReps));
    }

    @Test
    void aFixedRepTargetKeepsItsRepsThroughAHoldAStartingWeightAndASparseRack() {
        // K-991: every other path reads the range as it reads any range; with min = max it lands on the fixed reps.
        LiftSession atReps = new LiftSession(LiftKind.COMPOUND, BodyRegion.UPPER, FIVE_BY_FIVE, new BigDecimal("80"),
                List.of(new SetResult(5, 1), new SetResult(5, 1)), true);
        Progression addLoad = Progression.next(atReps, RepositoryParameters.forSex(Sex.MALE));

        assertThat(NextTargets.after(atReps, addLoad, true, 2)).as("the deload ladder holds the load (K-110)")
                .contains(new NextTargets.Target(new BigDecimal("80"), 5));
        assertThat(NextTargets.shown(new NextTargets.Target(new BigDecimal("82.5"), 5), new BigDecimal("80"), FIVE_BY_FIVE, true))
                .as("a hold begun after the target was set").isEqualTo(new NextTargets.Target(new BigDecimal("80"), 5));
        assertThat(NextTargets.after(atReps, addLoad, false, 2, 1, load -> new LoadSteps.Rounding.NoHeavier(), RepositoryParameters.forSex(Sex.MALE)))
                .as("nothing heavier in the gym: one more rep past the fixed reps (K-414), as past any range's top")
                .contains(new NextTargets.Target(new BigDecimal("80"), 6));
        assertThat(NextTargets.starting(new BigDecimal("80"), ASKED_REPS, FIVE_BY_FIVE, ExerciseCatalog.Equipment.BARBELL, "bench_press",
                Optional.empty())).as("a load lifted 8 times starts 5 x 5").contains(new NextTargets.Target(new BigDecimal("80"), 5));
        assertThat(NextTargets.starting(new BigDecimal("80"), ASKED_REPS, new RepRange(ASKED_REPS + 2, ASKED_REPS + 2),
                ExerciseCatalog.Equipment.BARBELL, "bench_press", Optional.empty())).as("too heavy for 10 x 10: found in the first session").isEmpty();
    }

    private static Progression step(ProgressionStep step) {
        return new Progression(step, List.of(new Reason(new RuleId("double_progression"), new Source("arastirma/ham/H3-bosluk-literatur.md#B4",
                SourceTag.LITERATURE))));
    }

    private static TrainingLog.WorkSet set(String kg, int reps, Integer rir) {
        return new TrainingLog.WorkSet("bench_press", Instant.parse("2026-10-05T18:00:00Z"), ExerciseCatalog.Load.EXTERNAL, new BigDecimal(kg), reps,
                rir, null);
    }
}
