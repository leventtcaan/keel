package app.keel.engine;

import static java.time.DayOfWeek.FRIDAY;
import static java.time.DayOfWeek.MONDAY;
import static java.time.DayOfWeek.SATURDAY;
import static java.time.DayOfWeek.THURSDAY;
import static java.time.DayOfWeek.TUESDAY;
import static java.time.DayOfWeek.WEDNESDAY;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.DayOfWeek;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * The default cardio prescription (K-958, ADR-074 #1; G2 K-31, K-32, K-35, K-36, K-46): in a fat-loss phase as many
 * sessions as training days, within cardio_sessions_cut_min..max, after the weights; missing sessions on off days at a
 * very low pace; in a muscle-gain phase cardio_sessions_build short sessions after the weights; no default for very active
 * work; the user's own prescription is never overwritten.
 *
 * <p>The table's expected weeks are written out for today's cardio.yaml (cut 3-5 × 30 min, build 2 × 20 min); the
 * boundary tests read the band from the parameters.
 */
class CardioPrescriptionTests {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static final int CUT_MIN = P.wholeNumber(ParameterKey.CARDIO_SESSIONS_CUT_MIN);
    private static final int CUT_MAX = P.wholeNumber(ParameterKey.CARDIO_SESSIONS_CUT_MAX);
    private static final int AFTER_LIFT_LINE = P.wholeNumber(ParameterKey.CARDIO_AFTER_LIFT_MAX_MINUTES);
    private static final Optional<ActivityLevel> DESK = Optional.of(ActivityLevel.INACTIVE);

    private static final CardioPlacement A = CardioPlacement.AFTER_LIFT;
    private static final CardioPlacement O = CardioPlacement.OFF_DAY_LOW_INTENSITY;

    private static CardioPrescription generated(Phase phase, Set<DayOfWeek> days, Optional<ActivityLevel> activity) {
        return CardioPrescription.forWeek(phase, days, activity, Optional.empty(), P).orElseThrow();
    }

    private static CardioSession s(DayOfWeek day, CardioPlacement placement) {
        return new CardioSession(day, placement);
    }

    static Stream<Arguments> weeks() {
        Set<DayOfWeek> one = EnumSet.of(MONDAY);
        Set<DayOfWeek> two = EnumSet.of(MONDAY, THURSDAY);
        Set<DayOfWeek> three = EnumSet.of(MONDAY, WEDNESDAY, FRIDAY);
        Set<DayOfWeek> four = EnumSet.of(MONDAY, TUESDAY, THURSDAY, FRIDAY);
        Set<DayOfWeek> five = EnumSet.range(MONDAY, FRIDAY);
        Set<DayOfWeek> six = EnumSet.range(MONDAY, SATURDAY);
        Set<DayOfWeek> seven = EnumSet.allOf(DayOfWeek.class);
        return Stream.of(
                // No training days: all three on off days, the first on Monday, the next as far from the others as the week allows.
                Arguments.of(Phase.CUT, EnumSet.noneOf(DayOfWeek.class), 30, List.of(s(MONDAY, O), s(THURSDAY, O), s(SATURDAY, O))),
                // 1 day: two sessions short of 3 go to off days, the furthest from any busy day, earliest on a tie.
                Arguments.of(Phase.CUT, one, 30, List.of(s(MONDAY, A), s(THURSDAY, O), s(SATURDAY, O))),
                Arguments.of(Phase.CUT, two, 30, List.of(s(MONDAY, A), s(THURSDAY, A), s(SATURDAY, O))),
                Arguments.of(Phase.CUT, three, 30, List.of(s(MONDAY, A), s(WEDNESDAY, A), s(FRIDAY, A))),
                Arguments.of(Phase.CUT, four, 30, List.of(s(MONDAY, A), s(TUESDAY, A), s(THURSDAY, A), s(FRIDAY, A))),
                Arguments.of(Phase.CUT, five, 30,
                        List.of(s(MONDAY, A), s(TUESDAY, A), s(WEDNESDAY, A), s(THURSDAY, A), s(FRIDAY, A))),
                // 6 days: at most 5, on the week's first five training days; Saturday stays weights only.
                Arguments.of(Phase.CUT, six, 30,
                        List.of(s(MONDAY, A), s(TUESDAY, A), s(WEDNESDAY, A), s(THURSDAY, A), s(FRIDAY, A))),
                Arguments.of(Phase.CUT, seven, 30,
                        List.of(s(MONDAY, A), s(TUESDAY, A), s(WEDNESDAY, A), s(THURSDAY, A), s(FRIDAY, A))),
                // A gaining phase never uses an off day (ADR-074 #1 gives the off-day fill to fat loss only; K-36).
                Arguments.of(Phase.BULK, one, 20, List.of(s(MONDAY, A))),
                Arguments.of(Phase.BULK, two, 20, List.of(s(MONDAY, A), s(THURSDAY, A))),
                Arguments.of(Phase.BULK, three, 20, List.of(s(MONDAY, A), s(WEDNESDAY, A))),
                Arguments.of(Phase.BULK, four, 20, List.of(s(MONDAY, A), s(TUESDAY, A))),
                Arguments.of(Phase.BULK, five, 20, List.of(s(MONDAY, A), s(TUESDAY, A))),
                Arguments.of(Phase.BULK, six, 20, List.of(s(MONDAY, A), s(TUESDAY, A))));
    }

    @ParameterizedTest
    @MethodSource("weeks")
    void phaseAndTrainingDaysGiveTheWeek(Phase phase, Set<DayOfWeek> days, int minutes, List<CardioSession> sessions) {
        CardioPrescription prescription = generated(phase, days, DESK);

        assertThat(prescription.origin()).isEqualTo(CardioOrigin.GENERATED);
        assertThat(prescription.minutes()).isEqualTo(minutes);
        assertThat(prescription.sessions()).containsExactlyElementsOf(sessions);
    }

    @ParameterizedTest
    @MethodSource("weeks")
    void everyActivityLevelButVeryActiveGetsTheSameWeek(Phase phase, Set<DayOfWeek> days, int minutes, List<CardioSession> sessions) {
        CardioPrescription desk = generated(phase, days, DESK);
        assertThat(desk.sessions()).containsExactlyElementsOf(sessions);

        Stream.of(Optional.<ActivityLevel>empty(), Optional.of(ActivityLevel.LOW_ACTIVE), Optional.of(ActivityLevel.ACTIVE))
                .forEach(activity -> assertThat(generated(phase, days, activity)).as(activity.toString()).isEqualTo(desk));
    }

    @ParameterizedTest
    @EnumSource(Phase.class)
    void veryActiveWorkHasNoDefault(Phase phase) {
        assertThat(P.flag(ParameterKey.CARDIO_NONE_VERY_ACTIVE)).as("cardio.yaml: no default for very active work (K-46)").isTrue();

        for (int count = 0; count <= DayOfWeek.values().length; count++) {
            Set<DayOfWeek> days = firstDays(count);
            assertThat(CardioPrescription.forWeek(phase, days, Optional.of(ActivityLevel.VERY_ACTIVE), Optional.empty(), P))
                    .as(days.toString()).isEmpty();
        }
    }

    @Test
    void aGainingWeekWithoutTrainingDaysHasNoCardio() {
        assertThat(CardioPrescription.forWeek(Phase.BULK, EnumSet.noneOf(DayOfWeek.class), DESK, Optional.empty(), P)).isEmpty();
    }

    @Test
    void withTheVeryActiveFlagOffVeryActiveWorkGetsTheSameWeek() {
        Parameters flagOff = withNoneVeryActive(false);
        Set<DayOfWeek> two = EnumSet.of(MONDAY, THURSDAY);

        for (Phase phase : Phase.values()) {
            assertThat(CardioPrescription.forWeek(phase, two, Optional.of(ActivityLevel.VERY_ACTIVE), Optional.empty(), flagOff))
                    .contains(CardioPrescription.forWeek(phase, two, DESK, Optional.empty(), flagOff).orElseThrow());
        }
        assertThat(CardioPrescription.forWeek(Phase.CUT, two, Optional.of(ActivityLevel.VERY_ACTIVE), Optional.empty(), flagOff)
                .orElseThrow().sessions()).containsExactly(s(MONDAY, A), s(THURSDAY, A), s(SATURDAY, O));
    }

    @Test
    void theCutBandIsReadFromTheParameters() {
        assertThat(sessionCount(CUT_MIN - 1)).isEqualTo(CUT_MIN);
        assertThat(sessionCount(CUT_MIN)).isEqualTo(CUT_MIN);
        assertThat(sessionCount(CUT_MIN + 1)).isEqualTo(CUT_MIN + 1);
        assertThat(sessionCount(CUT_MAX - 1)).isEqualTo(CUT_MAX - 1);
        assertThat(sessionCount(CUT_MAX)).isEqualTo(CUT_MAX);
        assertThat(sessionCount(CUT_MAX + 1)).isEqualTo(CUT_MAX);
    }

    @Test
    void belowTheBandOnlyTheMissingSessionsGoToOffDays() {
        // Monday and Tuesday busy: Friday is the free day furthest from both (Wednesday 1, Thursday 2, Friday 3, Saturday 2).
        CardioPrescription below = generated(Phase.CUT, EnumSet.of(MONDAY, TUESDAY), DESK);
        CardioPrescription at = generated(Phase.CUT, firstDays(CUT_MIN), DESK);

        assertThat(below.sessions()).containsExactly(s(MONDAY, A), s(TUESDAY, A), s(FRIDAY, O));
        assertThat(at.sessions()).allSatisfy(session -> assertThat(session.placement()).isEqualTo(A));
    }

    @Test
    void reasonsNameTheDoseThePlacementAndAnOffDayOnlyWhenOneIsUsed() {
        assertThat(ruleIds(generated(Phase.CUT, EnumSet.of(MONDAY, THURSDAY), DESK)))
                .containsExactly("cardio_cut_dose", "cardio_after_lift", "cardio_off_day_low_intensity");
        assertThat(ruleIds(generated(Phase.CUT, EnumSet.of(MONDAY, WEDNESDAY, FRIDAY), DESK)))
                .containsExactly("cardio_cut_dose", "cardio_after_lift");
        assertThat(ruleIds(generated(Phase.BULK, EnumSet.of(MONDAY, WEDNESDAY, FRIDAY), DESK)))
                .containsExactly("cardio_build_dose", "cardio_after_lift");
        assertThat(generated(Phase.CUT, EnumSet.of(MONDAY), DESK).reasons())
                .extracting(reason -> reason.source().reference())
                .containsExactly("arastirma/ham/guray/G2-kilo-verme.md#K-32", "arastirma/ham/guray/G2-kilo-verme.md#K-35",
                        "arastirma/ham/guray/G2-kilo-verme.md#K-36");
    }

    @Test
    void theUsersOwnPrescriptionIsReturnedAsItIs() {
        // Before-lifting is not a placement at all; the user's odd choices (an off-day session on a training day, a long
        // after-lifting session, a week turned off) are theirs to make (ADR-074 #4).
        CardioPrescription mine = CardioPrescription.user(45, List.of(s(TUESDAY, O), s(SATURDAY, A)));
        CardioPrescription off = CardioPrescription.user(0, List.of());

        for (Phase phase : Phase.values()) {
            for (ActivityLevel level : ActivityLevel.values()) {
                assertThat(CardioPrescription.forWeek(phase, EnumSet.range(MONDAY, SATURDAY), Optional.of(level), Optional.of(mine), P))
                        .containsSame(mine);
                assertThat(CardioPrescription.forWeek(phase, EnumSet.of(MONDAY), Optional.of(level), Optional.of(off), P))
                        .containsSame(off);
            }
        }
    }

    @Test
    void aGeneratedPrescriptionIsNotTakenAsTheUsers() {
        CardioPrescription engines = generated(Phase.CUT, EnumSet.of(MONDAY), DESK);

        assertThatThrownBy(() -> CardioPrescription.forWeek(Phase.CUT, EnumSet.of(MONDAY), DESK, Optional.of(engines), P))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aPrescriptionHasOneSessionADayAndMinutesWhenItHasSessions() {
        assertThatThrownBy(() -> CardioPrescription.user(30, List.of(s(MONDAY, A), s(MONDAY, O))))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> CardioPrescription.user(0, List.of(s(MONDAY, A))))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void sessionsAreKeptInWeekOrder() {
        assertThat(CardioPrescription.user(30, List.of(s(FRIDAY, A), s(MONDAY, A))).sessions())
                .containsExactly(s(MONDAY, A), s(FRIDAY, A));
    }

    @Test
    void theModelHasNoPlaceBeforeLifting() {
        assertThat(CardioPlacement.values()).containsExactly(A, O);
    }

    @Test
    void anAfterLiftingSessionOverTheLineIsAnInfoLineNotABlock() {
        assertThat(CardioPrescription.user(AFTER_LIFT_LINE, List.of(s(MONDAY, A))).afterLiftOverLine(P)).isFalse();
        assertThat(CardioPrescription.user(AFTER_LIFT_LINE + 1, List.of(s(MONDAY, A))).afterLiftOverLine(P)).isTrue();
        // Off days have no weights to protect.
        assertThat(CardioPrescription.user(AFTER_LIFT_LINE + 1, List.of(s(MONDAY, O))).afterLiftOverLine(P)).isFalse();
        assertThat(CardioPrescription.AFTER_LIFT_LINE.source().reference()).isEqualTo("arastirma/ham/guray/G2-kilo-verme.md#K-35");
    }

    @SuppressWarnings("unchecked")
    private static Parameters withNoneVeryActive(boolean on) {
        Map<String, Object> documents = ParametersLoaderTests.repositoryDocuments();
        List<Map<String, Object>> cardio =
                (List<Map<String, Object>>) ((Map<String, Object>) documents.get("cardio.yaml")).get("parameters");
        cardio.stream().filter(parameter -> "cardio_none_very_active".equals(parameter.get("key")))
                .forEach(parameter -> parameter.put("value", on));
        return ParameterSet.fromDocuments(documents).forSex(Sex.MALE);
    }

    private static int sessionCount(int trainingDays) {
        return generated(Phase.CUT, firstDays(trainingDays), DESK).sessions().size();
    }

    private static Set<DayOfWeek> firstDays(int count) {
        Set<DayOfWeek> days = EnumSet.noneOf(DayOfWeek.class);
        Arrays.stream(DayOfWeek.values()).limit(count).forEach(days::add);
        return days;
    }

    private static List<String> ruleIds(CardioPrescription prescription) {
        return prescription.reasons().stream().map(reason -> reason.rule().value()).toList();
    }
}
