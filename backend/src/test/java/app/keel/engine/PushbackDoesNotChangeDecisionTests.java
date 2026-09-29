package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static app.keel.engine.EngineFixtures.series;
import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.CheckIn.Look;
import app.keel.engine.CheckIn.Training;
import java.lang.reflect.RecordComponent;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import org.junit.jupiter.api.Test;

/**
 * U2: insistence does not change a decision; only data does (spec WC-15). The engine has no input for pushback, and the
 * same Snapshot gives the same Decision however often it is asked.
 */
class PushbackDoesNotChangeDecisionTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 26);

    @Test
    void theSnapshotHasNoPlaceForInsisting() {
        // Nothing the user says in an argument can reach the engine: no input carries it.
        List<String> suspicious = new ArrayList<>();
        for (Class<?> input : List.of(Snapshot.class, CheckIn.class, TrainingStatus.class, EnergyBudget.class, Profile.class)) {
            Arrays.stream(input.getRecordComponents()).map(RecordComponent::getName)
                    .filter(name -> name.toLowerCase().matches(".*(push|insist|object|argu|complain|disagree|override|request).*"))
                    .forEach(name -> suspicious.add(input.getSimpleName() + "." + name));
        }

        assertThat(suspicious).isEmpty();
    }

    @Test
    void askingAgainWithoutNewDataGivesTheSameDecision() {
        // Spec WC-15: toward the goal, looking better → continue; the user pushes back; nothing new → still continue.
        Snapshot snapshot = moving().withCheckIn(CheckIn.NONE.withLook(Look.BETTER).withTraining(Training.STABLE)
                .withAdherence(new BigDecimal("0.84")));
        Decision first = DecisionPipeline.decide(snapshot, parameters(Sex.MALE));

        for (int ask = 0; ask < 10; ask++) {
            assertThat(DecisionPipeline.decide(snapshot, parameters(Sex.MALE))).isEqualTo(first);
        }
        assertThat(first.action()).isEqualTo(new Action.Continue());
    }

    @Property
    boolean equalSnapshotsAlwaysGiveEqualDecisions(@ForAll("checkIns") CheckIn checkIn, @ForAll Phase phase) {
        // Two separately built but equal Snapshots: value equality in, value equality out (ADR-003 §1).
        Snapshot one = moving().withCheckIn(checkIn);
        Snapshot two = new Snapshot(TODAY, Sex.MALE, Phase.CUT, one.planStart(), one.weights()).withCheckIn(checkIn)
                .withEnergy(new EnergyBudget(2600, 300)).withProfile(new Profile(30, 180));
        Snapshot a = phase == Phase.CUT ? one : withPhase(one, phase);
        Snapshot b = phase == Phase.CUT ? two : withPhase(two, phase);
        return a.equals(b) && DecisionPipeline.decide(a, parameters(Sex.MALE)).equals(DecisionPipeline.decide(b, parameters(Sex.MALE)));
    }

    @Provide
    Arbitrary<CheckIn> checkIns() {
        return Combinators.combine(Arbitraries.of(Look.values()), Arbitraries.of(Training.values()),
                Arbitraries.of(CheckIn.Recovery.values()), Arbitraries.of(CheckIn.Waist.values()),
                Arbitraries.bigDecimals().between(BigDecimal.ZERO, BigDecimal.ONE).ofScale(2).optional(),
                Arbitraries.of(CheckIn.Appetite.values()))
                .as(CheckIn::new);
    }

    private static Snapshot moving() {
        List<WeighIn> weighIns = new ArrayList<>(EngineFixtures.daily(TODAY.minusDays(34), TODAY.minusDays(14), "80.0"));
        weighIns.addAll(EngineFixtures.daily(TODAY.minusDays(13), TODAY.minusDays(7), "79.5"));
        weighIns.addAll(EngineFixtures.daily(TODAY.minusDays(6), TODAY, "79.0"));
        return new Snapshot(TODAY, Sex.MALE, Phase.CUT, TODAY.minusDays(20), series(weighIns))
                .withEnergy(new EnergyBudget(2600, 300)).withProfile(new Profile(30, 180));
    }

    private static Snapshot withPhase(Snapshot snapshot, Phase phase) {
        return new Snapshot(snapshot.today(), snapshot.sex(), phase, snapshot.planStart(), snapshot.weights())
                .withCheckIn(snapshot.checkIn()).withEnergy(snapshot.energy().orElseThrow()).withProfile(snapshot.profile().orElseThrow());
    }
}
