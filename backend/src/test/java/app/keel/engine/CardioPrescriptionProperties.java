package app.keel.engine;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.DayOfWeek;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Assume;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;

/**
 * Over every week and activity level (K-958, ADR-074): the same input gives the same prescription; cardio never sits on
 * a training day other than after the weights, and an off-day session never on a training day (G2 K-35, K-36); one
 * session a day at most; a fat-loss week stays inside cardio_sessions_cut_min..max (K-32); the user's own prescription
 * comes back untouched (ADR-074 #4).
 */
class CardioPrescriptionProperties {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);

    @Property
    void theSameWeekGivesTheSamePrescription(@ForAll Phase phase, @ForAll("trainingDays") Set<DayOfWeek> days,
            @ForAll("activity") Optional<ActivityLevel> activity) {
        // The same days handed over in another iteration order (a LinkedHashSet, Sunday first) change nothing.
        Set<DayOfWeek> reordered = new LinkedHashSet<>(days.stream().sorted(Comparator.reverseOrder()).toList());

        Optional<CardioPrescription> first = CardioPrescription.forWeek(phase, days, activity, Optional.empty(), P);
        assertThat(CardioPrescription.forWeek(phase, days, activity, Optional.empty(), P)).isEqualTo(first);
        assertThat(CardioPrescription.forWeek(phase, reordered, activity, Optional.empty(), P)).isEqualTo(first);
    }

    @Property
    void cardioIsAfterTheWeightsOnATrainingDayAndLowPaceOnlyOnAnOffDay(@ForAll Phase phase,
            @ForAll("trainingDays") Set<DayOfWeek> days, @ForAll("activity") Optional<ActivityLevel> activity) {
        Optional<CardioPrescription> prescription = CardioPrescription.forWeek(phase, days, activity, Optional.empty(), P);

        prescription.ifPresent(generated -> {
            assertThat(generated.origin()).isEqualTo(CardioOrigin.GENERATED);
            assertThat(generated.sessions()).allSatisfy(session -> assertThat(session.placement()).isEqualTo(
                    days.contains(session.day()) ? CardioPlacement.AFTER_LIFT : CardioPlacement.OFF_DAY_LOW_INTENSITY));
            assertThat(generated.sessions()).extracting(CardioSession::day).doesNotHaveDuplicates();
            assertThat(generated.minutes()).isPositive();
            assertThat(generated.reasons()).isNotEmpty();
        });
    }

    @Property
    void offDaysAreUsedOnlyWhenTrainingDaysAreTooFew(@ForAll Phase phase, @ForAll("trainingDays") Set<DayOfWeek> days,
            @ForAll("activity") Optional<ActivityLevel> activity) {
        CardioPrescription.forWeek(phase, days, activity, Optional.empty(), P).ifPresent(generated -> {
            long afterLift = generated.sessions().stream().filter(s -> s.placement() == CardioPlacement.AFTER_LIFT).count();
            long offDay = generated.sessions().size() - afterLift;
            assertThat(afterLift).isEqualTo(Math.min(days.size(), generated.sessions().size()));
            if (offDay > 0) {
                assertThat(days.size()).isLessThan(generated.sessions().size());
            }
        });
    }

    @Property
    void aFatLossWeekStaysInsideTheBand(@ForAll("trainingDays") Set<DayOfWeek> days, @ForAll("activity") Optional<ActivityLevel> activity) {
        Assume.that(activity.filter(level -> level == ActivityLevel.VERY_ACTIVE).isEmpty());
        CardioPrescription cut = CardioPrescription.forWeek(Phase.CUT, days, activity, Optional.empty(), P).orElseThrow();

        assertThat(cut.sessions()).hasSizeBetween(P.wholeNumber(ParameterKey.CARDIO_SESSIONS_CUT_MIN),
                P.wholeNumber(ParameterKey.CARDIO_SESSIONS_CUT_MAX));
        assertThat(cut.minutes()).isEqualTo(P.wholeNumber(ParameterKey.CARDIO_MINUTES_CUT));
    }

    @Property
    void aMuscleGainWeekHasTheBuildDose(@ForAll("trainingDays") Set<DayOfWeek> days, @ForAll("activity") Optional<ActivityLevel> activity) {
        Assume.that(activity.filter(level -> level == ActivityLevel.VERY_ACTIVE).isEmpty());
        CardioPrescription build = CardioPrescription.forWeek(Phase.BULK, days, activity, Optional.empty(), P).orElseThrow();

        assertThat(build.sessions()).hasSize(P.wholeNumber(ParameterKey.CARDIO_SESSIONS_BUILD));
        assertThat(build.minutes()).isEqualTo(P.wholeNumber(ParameterKey.CARDIO_MINUTES_BUILD));
    }

    @Property
    void theUsersPrescriptionIsNeverOverwritten(@ForAll Phase phase, @ForAll("trainingDays") Set<DayOfWeek> days,
            @ForAll("activity") Optional<ActivityLevel> activity, @ForAll("usersOwn") CardioPrescription mine) {
        assertThat(CardioPrescription.forWeek(phase, days, activity, Optional.of(mine), P)).containsSame(mine);
    }

    @Provide
    Arbitrary<Set<DayOfWeek>> trainingDays() {
        return Arbitraries.of(DayOfWeek.class).set().ofMinSize(0).ofMaxSize(DayOfWeek.values().length);
    }

    @Provide
    Arbitrary<Optional<ActivityLevel>> activity() {
        return Arbitraries.of(ActivityLevel.class).optional();
    }

    @Provide
    Arbitrary<CardioPrescription> usersOwn() {
        Arbitrary<List<CardioSession>> sessions = Arbitraries.of(DayOfWeek.class).set()
                .flatMap(days -> Combinators.combine(days.stream()
                        .map(day -> Arbitraries.of(CardioPlacement.class).map(placement -> new CardioSession(day, placement)))
                        .toList()).as(list -> list));
        return Combinators.combine(Arbitraries.integers().between(1, 120), sessions)
                .as((minutes, list) -> CardioPrescription.user(list.isEmpty() ? 0 : minutes, list));
    }
}
