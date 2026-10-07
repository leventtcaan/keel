package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.Decision;
import app.keel.engine.DecisionPipeline;
import app.keel.engine.EnergyBudget;
import app.keel.engine.ParameterDomain;
import app.keel.engine.ParameterSet;
import app.keel.engine.Parameters;
import app.keel.engine.Phase;
import app.keel.engine.SafetyNet;
import app.keel.engine.Sex;
import app.keel.engine.Snapshot;
import app.keel.engine.WeighIn;
import app.keel.engine.WeightSeries;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import net.jqwik.api.Example;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.constraints.BigRange;
import net.jqwik.api.constraints.IntRange;
import net.jqwik.api.statistics.Statistics;
import org.springframework.core.io.ClassPathResource;
import org.yaml.snakeyaml.Yaml;

/**
 * From the engine's side (K-963 review): whatever the safety net decides — {@code SafetyNet.check} and the BMR floor a
 * calorie step meets — is, once kept as the call ({@link DecisionJson#of}), a call {@link SafetyCalls#restsOnTheSafetyNet}
 * recognises, so "Keep last week's plan" is never offered on it (U13). The inputs are the engine's own: the safety net
 * says which calls are its, not a copy of its rule list. The bodies follow SafetyNetTests' fixtures.
 */
class SafetyNetCallsTests {

    private static final ParameterSet PARAMETERS = engineParameters();
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 5);

    // ── one body per rule of the safety net (SafetyNetTests' numbers) ────────────────────────────────────────

    @Example
    void theHardStop() {
        assertKeptAsASafetyCall(fueled(Sex.FEMALE, "60.0", "28", 1800, 0).withMenstrualLossReported(true));
    }

    @Example
    void theWeeklyLossCap() {
        assertKeptAsASafetyCall(losing("70.9", "70.0", Sex.MALE));
    }

    @Example
    void lowEnergyAvailabilityOnACutAndOnABulk() {
        assertKeptAsASafetyCall(fueled(Sex.MALE, "80.0", "25", 1899, 400));
        assertKeptAsASafetyCall(new Snapshot(TODAY, Sex.MALE, Phase.BULK, TODAY.minusDays(60), steady("80.0"), Optional.of(new BigDecimal("25")))
                .withEnergy(new EnergyBudget(1500, 300)));
    }

    @Example
    void theFatFloor() {
        assertKeptAsASafetyCall(fueled(Sex.FEMALE, "55.0", "17.9", 2200, 0));
        assertKeptAsASafetyCall(fueled(Sex.MALE, "75.0", "7.9", 3000, 0));
    }

    @Example
    void aCalorieStepUnderBmr() {
        Optional<Decision> floor = SafetyNet.bmrFloor(1450, 1500, losing("70.0", "70.0", Sex.MALE), PARAMETERS.forSex(Sex.MALE));

        assertThat(floor).isPresent();
        assertThat(SafetyCalls.restsOnTheSafetyNet(DecisionJson.of(floor.get()))).isTrue();
    }

    // ── any body: what the safety net decides is kept as a safety call ──────────────────────────────────────

    @Property(tries = 400)
    void whateverTheSafetyNetDecidesIsKeptAsASafetyCall(@ForAll boolean female, @ForAll boolean cut,
            @ForAll @BigRange(min = "45", max = "140") BigDecimal kg, @ForAll @IntRange(min = 0, max = 30) int weeklyLossTenthsKg,
            @ForAll @IntRange(min = 6, max = 40) int fatPct, @ForAll @IntRange(min = 900, max = 3500) int targetKcal,
            @ForAll @IntRange(min = 0, max = 800) int exerciseKcal, @ForAll boolean cycleLost) {
        Sex sex = female ? Sex.FEMALE : Sex.MALE;
        BigDecimal now = kg.setScale(1, java.math.RoundingMode.HALF_UP);
        BigDecimal weekAgo = now.add(BigDecimal.valueOf(weeklyLossTenthsKg, 1));
        Snapshot snapshot = new Snapshot(TODAY, sex, cut ? Phase.CUT : Phase.BULK, TODAY.minusDays(60), twoWeeks(weekAgo, now),
                Optional.of(BigDecimal.valueOf(fatPct))).withEnergy(new EnergyBudget(targetKcal, exerciseKcal))
                .withMenstrualLossReported(female && cycleLost);
        Optional<Decision> safety = SafetyNet.check(snapshot, PARAMETERS.forSex(sex));
        Statistics.collect(safety.isPresent() ? "safety net decides" : "safety net passes");
        Statistics.coverage(coverage -> coverage.check("safety net decides").count(n -> n > 0));

        safety.ifPresent(decision -> {
            assertThat(SafetyCalls.restsOnTheSafetyNet(DecisionJson.of(decision))).as(decision.toString()).isTrue();
            assertThat(SafetyCalls.restsOnTheSafetyNet(DecisionJson.of(DecisionPipeline.decide(snapshot, PARAMETERS.forSex(sex)))))
                    .as("the call the pipeline makes").isTrue();
        });
    }

    @Property(tries = 200)
    void everyCalorieStepTheBmrFloorStopsIsKeptAsASafetyCall(@ForAll @IntRange(min = 800, max = 2500) int bmrKcal,
            @ForAll @IntRange(min = 1, max = 700) int under) {
        Optional<Decision> floor = SafetyNet.bmrFloor(bmrKcal - under, bmrKcal, losing("70.0", "70.0", Sex.MALE), PARAMETERS.forSex(Sex.MALE));

        assertThat(floor).isPresent();
        assertThat(SafetyCalls.restsOnTheSafetyNet(DecisionJson.of(floor.get()))).isTrue();
    }

    private static void assertKeptAsASafetyCall(Snapshot snapshot) {
        Parameters p = PARAMETERS.forSex(snapshot.sex());
        Optional<Decision> safety = SafetyNet.check(snapshot, p);

        assertThat(safety).as("the safety net decides").isPresent();
        assertThat(SafetyCalls.restsOnTheSafetyNet(DecisionJson.of(safety.get()))).isTrue();
        assertThat(SafetyCalls.restsOnTheSafetyNet(DecisionJson.of(DecisionPipeline.decide(snapshot, p)))).isTrue();
    }

    // ── bodies ──────────────────────────────────────────────────────────────────────────────────────────────

    /** A steady weight on a cut, a fat estimate and a plan budget (SafetyNetTests.fueled). */
    private static Snapshot fueled(Sex sex, String kg, String fatPct, int targetKcal, int exerciseKcal) {
        return new Snapshot(TODAY, sex, Phase.CUT, TODAY.minusDays(60), steady(kg), Optional.of(new BigDecimal(fatPct)))
                .withEnergy(new EnergyBudget(targetKcal, exerciseKcal));
    }

    /** Weeks at {@code weekAgoKg}, then seven days at {@code nowKg} (SafetyNetTests.losing). */
    private static Snapshot losing(String weekAgoKg, String nowKg, Sex sex) {
        return new Snapshot(TODAY, sex, Phase.CUT, TODAY.minusDays(60), twoWeeks(new BigDecimal(weekAgoKg), new BigDecimal(nowKg)));
    }

    private static WeightSeries steady(String kg) {
        return daily(TODAY.minusDays(40), TODAY, new BigDecimal(kg));
    }

    private static WeightSeries twoWeeks(BigDecimal weekAgoKg, BigDecimal nowKg) {
        List<WeighIn> weighIns = new ArrayList<>(daily(TODAY.minusDays(40), TODAY.minusDays(7), weekAgoKg).weighIns());
        weighIns.addAll(daily(TODAY.minusDays(6), TODAY, nowKg).weighIns());
        return new WeightSeries(weighIns);
    }

    private static WeightSeries daily(LocalDate first, LocalDate last, BigDecimal kg) {
        List<WeighIn> weighIns = new ArrayList<>();
        for (LocalDate day = first; !day.isAfter(last); day = day.plusDays(1)) {
            weighIns.add(new WeighIn(day, kg.round(MathContext.DECIMAL64)));
        }
        return new WeightSeries(weighIns);
    }

    private static ParameterSet engineParameters() {
        Map<String, Object> documents = new HashMap<>();
        for (ParameterDomain domain : ParameterDomain.values()) {
            try (InputStream in = new ClassPathResource("data/parameters/" + domain.fileName()).getInputStream()) {
                documents.put(domain.fileName(), new Yaml().load(in));
            } catch (IOException e) {
                throw new IllegalStateException(domain.fileName(), e);
            }
        }
        return ParameterSet.fromDocuments(documents);
    }
}
