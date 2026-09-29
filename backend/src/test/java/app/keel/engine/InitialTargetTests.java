package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static app.keel.engine.EngineFixtures.series;
import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.constraints.BigRange;
import net.jqwik.api.constraints.IntRange;
import org.junit.jupiter.api.Test;

/**
 * The starting calorie estimate (K-114, ADR-020 L-7): Mifflin-St Jeor resting energy × an activity factor (H6 A1,
 * A3), shown as a range (U5), never under resting energy; then held for maintenance_observation_days while the scale
 * says what maintenance really is (Güray G2 K-8: observation beats the formula; men 14, women 28 days).
 */
class InitialTargetTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 26);
    private static final Parameters MALE = parameters(Sex.MALE);
    private static final Parameters FEMALE = parameters(Sex.FEMALE);
    private static final Profile THIRTY_180 = new Profile(30, 180);

    // ── resting energy ──────────────────────────────────────────────────────────────────────────────────────

    @Test
    void restingEnergyIsMifflinStJeor() {
        // Men: 10 × 80 + 6.25 × 180 − 5 × 30 + 5 = 1780. Women: 10 × 60 + 6.25 × 165 − 5 × 30 − 161 = 1320.25 → 1320.
        assertThat(InitialTarget.restingKcal(Sex.MALE, new BigDecimal("80"), THIRTY_180, MALE)).isEqualTo(1780);
        assertThat(InitialTarget.restingKcal(Sex.FEMALE, new BigDecimal("60"), new Profile(30, 165), FEMALE)).isEqualTo(1320);
    }

    @Test
    void olderMeansLessRestingEnergy() {
        assertThat(InitialTarget.restingKcal(Sex.MALE, new BigDecimal("80"), new Profile(50, 180), MALE))
                .isEqualTo(1780 - 5 * 20);
    }

    // ── the estimate ────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void maintenanceIsRestingEnergyTimesTheActivityFactor() {
        // NASEM 2023 typical values (H6 A3): 1.4 / 1.6 / 1.75 / 2.05.
        assertThat(estimate(Optional.of(ActivityLevel.INACTIVE)).maintenanceKcal()).isEqualTo(2492);
        assertThat(estimate(Optional.of(ActivityLevel.LOW_ACTIVE)).maintenanceKcal()).isEqualTo(2848);
        assertThat(estimate(Optional.of(ActivityLevel.ACTIVE)).maintenanceKcal()).isEqualTo(3115);
        assertThat(estimate(Optional.of(ActivityLevel.VERY_ACTIVE)).maintenanceKcal()).isEqualTo(3649);
    }

    @Test
    void anUnknownActivityLevelUsesTheMeasuredCommonValue() {
        // activity_factor_unknown = 1.6: the modal PAL of sedentary Western adults (FAO, Black 1996), not the 1.2 of
        // popular calculators, which has no primary source (H6 A3-d).
        assertThat(estimate(Optional.empty()).maintenanceKcal()).isEqualTo(2848);
    }

    @Test
    void theEstimateIsARange() {
        // U5 and H6 A4: formula plus activity factor miss an individual by about ±13 %; shown ±15 %.
        InitialTarget.Estimate estimate = estimate(Optional.of(ActivityLevel.LOW_ACTIVE));

        assertThat(estimate.lowKcal()).isEqualTo(2421);
        assertThat(estimate.highKcal()).isEqualTo(3275);
        assertThat(estimate.restingKcal()).isEqualTo(1780);
    }

    @Test
    void aWomansEstimateUsesHerConstant() {
        // 1320.25 × 1.6 = 2112.4 → 2112 (rounded once, at the end).
        InitialTarget.Estimate estimate = InitialTarget.estimate(Sex.FEMALE, new BigDecimal("60"), new Profile(30, 165),
                Optional.empty(), FEMALE);

        assertThat(estimate.maintenanceKcal()).isEqualTo(2112);
        // 167 cm: resting 1332.75 → 2132.4 → 2132. Rounding resting first would give 2131 (down) or 2133 (half up).
        assertThat(InitialTarget.estimate(Sex.FEMALE, new BigDecimal("60"), new Profile(30, 167), Optional.empty(), FEMALE)
                .maintenanceKcal()).isEqualTo(2132);
    }

    // ── observation ─────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void theStartingTargetHoldsWhileMaintenanceIsObserved() {
        // G2 K-8: pick a number, watch the scale 1-2 weeks; women 28 days (ADR-020 L-7). Day 13 of 14 still observes.
        Snapshot man = observing(Sex.MALE, TODAY.minusDays(12));

        Optional<Decision> decision = InitialTarget.observing(man, MALE);

        assertThat(decision).hasValueSatisfying(d -> {
            assertThat(d.action()).isEqualTo(new Action.NoDecisionYet());
            assertThat(d.reasons()).containsExactly(new Reason(new RuleId("observing"),
                    new Source("arastirma/ham/guray/G2-kilo-verme.md#K-8", SourceTag.EXPERIENCE)));
            assertThat(d.nextReview()).isEqualTo(TODAY.minusDays(12).plusDays(13));
            assertThat(d.copyKey()).isEqualTo(new CopyKey("decision.no_decision_yet.observing"));
        });
    }

    @Test
    void observationEndsOnItsLastDay() {
        assertThat(InitialTarget.observing(observing(Sex.MALE, TODAY.minusDays(13)), MALE)).isEmpty();
    }

    @Test
    void aWomanIsObservedFourWeeks() {
        assertThat(InitialTarget.observing(observing(Sex.FEMALE, TODAY.minusDays(26)), FEMALE)).isPresent();
        assertThat(InitialTarget.observing(observing(Sex.FEMALE, TODAY.minusDays(27)), FEMALE)).isEmpty();
    }

    @Test
    void aPlanThatIsNotTheStartingEstimateIsNotObserved() {
        Snapshot adjusted = observing(Sex.MALE, TODAY.minusDays(2)).withObservingMaintenance(false);

        assertThat(InitialTarget.observing(adjusted, MALE)).isEmpty();
    }

    @Test
    void everyCopyKeyItCanReturnHasATitleAndBodyInEnJson() {
        assertThat(EngineFixtures.copyGroup(new CopyKey("decision.no_decision_yet.observing")))
                .hasEntrySatisfying("title", title -> assertThat(title).isInstanceOf(String.class))
                .hasEntrySatisfying("body", body -> assertThat(body).isInstanceOf(String.class));
    }

    // ── properties ──────────────────────────────────────────────────────────────────────────────────────────

    @Property
    boolean theStartingTargetIsNeverUnderRestingEnergy(@ForAll @BigRange(min = "40", max = "200") BigDecimal kg,
            @ForAll @IntRange(min = 18, max = 90) int age, @ForAll @IntRange(min = 140, max = 210) int heightCm,
            @ForAll Sex sex, @ForAll ActivityLevel activity) {
        InitialTarget.Estimate estimate = InitialTarget.estimate(sex, kg, new Profile(age, heightCm), Optional.of(activity),
                parameters(sex));
        return estimate.maintenanceKcal() >= estimate.restingKcal()
                && estimate.lowKcal() <= estimate.maintenanceKcal() && estimate.maintenanceKcal() <= estimate.highKcal();
    }

    @Property
    boolean moreActiveNeverMeansLessFood(@ForAll ActivityLevel lower, @ForAll ActivityLevel higher) {
        ActivityLevel less = lower.compareTo(higher) <= 0 ? lower : higher;
        ActivityLevel more = lower.compareTo(higher) <= 0 ? higher : lower;
        return estimate(Optional.of(more)).maintenanceKcal() >= estimate(Optional.of(less)).maintenanceKcal();
    }

    // ── helpers ─────────────────────────────────────────────────────────────────────────────────────────────

    private static InitialTarget.Estimate estimate(Optional<ActivityLevel> activity) {
        return InitialTarget.estimate(Sex.MALE, new BigDecimal("80"), THIRTY_180, activity, MALE);
    }

    private static Snapshot observing(Sex sex, LocalDate planStart) {
        return new Snapshot(TODAY, sex, Phase.CUT, planStart, series(EngineFixtures.daily(planStart, TODAY, "80.0")))
                .withObservingMaintenance(true);
    }
}
