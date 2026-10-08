package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import org.junit.jupiter.api.Test;

/**
 * Double progression on compound lifts (K-109, H3 B4): add reps inside the range; when every set reaches the top
 * with clean technique, add the smallest load step for the body region and start again at the bottom. Isolation
 * lifts are not load-tracked (G6 K-33); unclean technique holds the load (G6 K-31); sets end at RIR 0-1 (G1 K-5).
 */
class ProgressionTests {

    private static final Parameters P = parameters(Sex.MALE);
    private static final RepRange EIGHT_TO_TWELVE = new RepRange(8, 12);
    private static final BigDecimal UPPER_STEP = BigDecimal.valueOf(P.number(ParameterKey.LOAD_INCREMENT_UPPER_KG));
    private static final BigDecimal LOWER_STEP = BigDecimal.valueOf(P.number(ParameterKey.LOAD_INCREMENT_LOWER_KG));

    @Test
    void everySetAtTheTopAddsTheUpperBodyStepAndRestartsAtTheBottom() {
        // Bench 60 kg, 3 × 12 at RIR 1, clean → 60 + 2.5 = 62.5 kg for 3 × 8.
        Progression next = Progression.next(bench("60", List.of(set(12, 1), set(12, 1), set(12, 0)), true), P);

        assertThat(next.step()).isEqualTo(new ProgressionStep.AddLoad(new BigDecimal("60").add(UPPER_STEP), 8));
        assertThat(next.reasons()).extracting(Reason::rule).containsExactly(new RuleId("double_progression"));
    }

    @Test
    void theLowerBodyTakesTheBiggerStep() {
        // Squat 100 kg, all sets at the top → 100 + 5 = 105 kg (H3 B4: 5 kg lower, 2.5 kg upper).
        LiftSession squat = new LiftSession(LiftKind.COMPOUND, BodyRegion.LOWER, EIGHT_TO_TWELVE, new BigDecimal("100"),
                List.of(set(12, 1), set(12, 1)), true);

        assertThat(Progression.next(squat, P).step())
                .isEqualTo(new ProgressionStep.AddLoad(new BigDecimal("100").add(LOWER_STEP), 8));
    }

    @Test
    void oneSetShortOfTheTopMeansMoreRepsNotMoreLoad() {
        Progression next = Progression.next(bench("60", List.of(set(12, 1), set(12, 1), set(11, 0)), true), P);

        assertThat(next.step()).isEqualTo(new ProgressionStep.AddReps());
        assertThat(next.reasons()).containsExactly(new Reason(new RuleId("double_progression"),
                new Source("arastirma/ham/H3-bosluk-literatur.md#B4", SourceTag.LITERATURE)));
    }

    @Test
    void uncleanTechniqueBelowTheTopAlsoHolds() {
        // H3 B4: reps are added "with good technique"; chasing a rep on broken form is not progress (G6 K-32/K-33).
        Progression next = Progression.next(bench("60", List.of(set(10, 1), set(9, 1)), false), P);

        assertThat(next.step()).isEqualTo(new ProgressionStep.Hold());
        assertThat(next.reasons()).extracting(Reason::rule).containsExactly(new RuleId("technique_gate"));
    }

    @Test
    void oneSetLeftFarFromFailureIsEnoughForTheNote() {
        int targetRir = P.wholeNumber(ParameterKey.TARGET_RIR_MAX);
        Progression next = Progression.next(bench("60", List.of(set(10, targetRir), set(10, targetRir + 2)), true), P);

        assertThat(next.reasons()).extracting(Reason::rule)
                .containsExactly(new RuleId("double_progression"), new RuleId("closer_to_failure"));
    }

    @Test
    void aProgressionWithoutAReasonCannotBeBuilt() {
        assertThatThrownBy(() -> new Progression(new ProgressionStep.AddReps(), List.of()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void goingPastTheTopStillCountsAsReachingIt() {
        assertThat(Progression.next(bench("60", List.of(set(13, 1), set(12, 1)), true), P).step())
                .isInstanceOf(ProgressionStep.AddLoad.class);
    }

    @Test
    void uncleanTechniqueHoldsTheLoadEvenAtTheTop() {
        // coaching experience, G6 K-31: load goes on only when the current load moves with perfect, comfortable form.
        Progression next = Progression.next(bench("60", List.of(set(12, 1), set(12, 1), set(12, 1)), false), P);

        assertThat(next.step()).isEqualTo(new ProgressionStep.Hold());
        assertThat(next.reasons()).containsExactly(new Reason(new RuleId("technique_gate"),
                new Source("arastirma/ham/guray/G6-eski-arsiv.md#K-31", SourceTag.EXPERIENCE)));
    }

    @Test
    void isolationLiftsAreNotLoadTracked() {
        // coaching experience, G6 K-33: lateral raise 12.5-15 kg for ten years; trained by feel.
        LiftSession lateralRaise = new LiftSession(LiftKind.ISOLATION, BodyRegion.UPPER, new RepRange(10, 15),
                new BigDecimal("12.5"), List.of(set(15, 0), set(15, 0)), true);

        Progression next = Progression.next(lateralRaise, P);

        assertThat(next.step()).isEqualTo(new ProgressionStep.NotTracked());
        assertThat(next.reasons()).containsExactly(new Reason(new RuleId("isolation_not_tracked"),
                new Source("arastirma/ham/guray/G6-eski-arsiv.md#K-33", SourceTag.EXPERIENCE)));
    }

    @Test
    void setsLeftFarFromFailureAreToldToGoCloser() {
        // G1 K-5: end work sets at RIR 0-1. Not at the top and RIR 3 → more reps, and say why.
        Progression next = Progression.next(bench("60", List.of(set(10, 3), set(10, 3)), true), P);

        assertThat(next.step()).isEqualTo(new ProgressionStep.AddReps());
        assertThat(next.reasons()).extracting(Reason::rule).contains(new RuleId("closer_to_failure"));
    }

    @Test
    void setsAtTheTargetRirNeedNoEffortNote() {
        int targetRir = P.wholeNumber(ParameterKey.TARGET_RIR_MAX);
        Progression next = Progression.next(bench("60", List.of(set(10, targetRir), set(10, targetRir)), true), P);

        assertThat(next.reasons()).extracting(Reason::rule).doesNotContain(new RuleId("closer_to_failure"));
    }

    @Test
    void theSwitchesInTheParameterFileAreRespected() {
        // load_progression_compound_only and technique_gate_required are parameters so the rules can be audited (K2).
        Parameters relaxed = withFlags(false, false);
        LiftSession isolationAtTop = new LiftSession(LiftKind.ISOLATION, BodyRegion.UPPER, EIGHT_TO_TWELVE,
                new BigDecimal("20"), List.of(set(12, 1)), true);

        assertThat(Progression.next(isolationAtTop, relaxed).step()).isInstanceOf(ProgressionStep.AddLoad.class);
        assertThat(Progression.next(bench("60", List.of(set(12, 1)), false), relaxed).step())
                .isInstanceOf(ProgressionStep.AddLoad.class);
    }

    @Test
    void aFixedRepTargetHasOneRungEveryWorkSetAtItsRepsAddsTheLoad() {
        // K-991 (5 x 5, min = max): double progression with one rung (H3 B4: at the top, the smallest load step, back to the
        // bottom, which is the top). Short of it, no load; the reps to reach stay the fixed reps (NextTargets).
        RepRange fiveByFive = new RepRange(5, 5);
        LiftSession hit = new LiftSession(LiftKind.COMPOUND, BodyRegion.LOWER, fiveByFive, new BigDecimal("100"),
                List.of(set(5, 1), set(5, 1), set(6, 0), set(5, 1), set(5, 0)), true);
        LiftSession missed = new LiftSession(LiftKind.COMPOUND, BodyRegion.LOWER, fiveByFive, new BigDecimal("100"),
                List.of(set(5, 1), set(5, 1), set(4, 0)), true);

        assertThat(Progression.next(hit, P).step()).isEqualTo(new ProgressionStep.AddLoad(new BigDecimal("100").add(LOWER_STEP), 5));
        assertThat(Progression.next(missed, P).step()).isEqualTo(new ProgressionStep.AddReps());
    }

    @Test
    void refusesMalformedInput() {
        assertThatThrownBy(() -> new RepRange(12, 8)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new RepRange(0, 5)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new RepRange(6, 5)).as("a fixed target is min = max, never max under min").isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new RepRange(0, 0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new SetResult(-1, 1)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new SetResult(8, -1)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> bench("60", List.of(), true)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> bench("0", List.of(set(8, 1)), true)).isInstanceOf(IllegalArgumentException.class);
    }

    // ── properties ──────────────────────────────────────────────────────────────────────────────────────────

    @Property
    boolean loadGoesOnOnlyWhenEverySetReachedTheTopWithCleanTechnique(@ForAll("compoundSessions") LiftSession session) {
        boolean added = Progression.next(session, P).step() instanceof ProgressionStep.AddLoad;
        boolean earned = session.techniqueClean() && session.sets().stream().allMatch(s -> s.reps() >= session.range().max());
        return added == earned;
    }

    @Property
    boolean uncleanTechniqueAlwaysHolds(@ForAll("compoundSessions") LiftSession session) {
        return session.techniqueClean() || Progression.next(session, P).step() instanceof ProgressionStep.Hold;
    }

    @Property
    boolean theEffortNoteAppearsExactlyWhenRepsAreAddedAndASetWasLeftShort(@ForAll("compoundSessions") LiftSession session) {
        Progression next = Progression.next(session, P);
        int targetRir = P.wholeNumber(ParameterKey.TARGET_RIR_MAX);
        boolean noted = next.reasons().stream().anyMatch(r -> r.rule().equals(new RuleId("closer_to_failure")));
        boolean due = next.step() instanceof ProgressionStep.AddReps && session.sets().stream().anyMatch(s -> s.rir() > targetRir);
        return noted == due;
    }

    @Property
    boolean aLoadStepIsExactlyTheRegionsIncrementAndRestartsAtTheBottom(@ForAll("compoundSessions") LiftSession session) {
        if (!(Progression.next(session, P).step() instanceof ProgressionStep.AddLoad(BigDecimal newLoad, int reps))) {
            return true;
        }
        BigDecimal step = session.region() == BodyRegion.UPPER ? UPPER_STEP : LOWER_STEP;
        return newLoad.compareTo(session.loadKg().add(step)) == 0 && reps == session.range().min();
    }

    @Provide
    Arbitrary<LiftSession> compoundSessions() {
        Arbitrary<RepRange> ranges = Arbitraries.integers().between(3, 15)
                .flatMap(min -> Arbitraries.integers().between(min, min + 6).map(max -> new RepRange(min, max))); // min = max: a fixed target (K-991)
        return ranges.flatMap(range -> Combinators.combine(
                Arbitraries.of(BodyRegion.values()),
                Arbitraries.bigDecimals().between(new BigDecimal("20"), new BigDecimal("250")).ofScale(1),
                Combinators.combine(Arbitraries.integers().between(range.min() - 2, range.max() + 2),
                        Arbitraries.integers().between(0, 4)).as(SetResult::new).list().ofMinSize(1).ofMaxSize(5),
                Arbitraries.of(true, false))
                .as((region, load, sets, clean) -> new LiftSession(LiftKind.COMPOUND, region, range, load, sets, clean)));
    }

    // ── helpers ─────────────────────────────────────────────────────────────────────────────────────────────

    private static SetResult set(int reps, int rir) {
        return new SetResult(reps, rir);
    }

    private static LiftSession bench(String kg, List<SetResult> sets, boolean clean) {
        return new LiftSession(LiftKind.COMPOUND, BodyRegion.UPPER, EIGHT_TO_TWELVE, new BigDecimal(kg), sets, clean);
    }

    @SuppressWarnings("unchecked")
    private static Parameters withFlags(boolean compoundOnly, boolean techniqueGate) {
        Map<String, Object> documents = ParametersLoaderTests.repositoryDocuments();
        List<Map<String, Object>> training =
                (List<Map<String, Object>>) ((Map<String, Object>) documents.get("training.yaml")).get("parameters");
        for (Map<String, Object> parameter : new ArrayList<>(training)) {
            if ("load_progression_compound_only".equals(parameter.get("key"))) {
                parameter.put("value", compoundOnly);
            }
            if ("technique_gate_required".equals(parameter.get("key"))) {
                parameter.put("value", techniqueGate);
            }
        }
        return ParameterSet.fromDocuments(documents).forSex(Sex.MALE);
    }
}
