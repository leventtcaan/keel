package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/**
 * The first eight weeks (K-513, ADR-040; 04 §7.5, I1 F2): the user's own week since the account began, each with its
 * content — the first silent — and from week five the risk: any of the week just over's signals (no session, the
 * forgiven week used, logging dropped), none weighed against another (no source gives weights, U14).
 */
class FirstWeeksTests {

    private static final Parameters MALE = parameters(Sex.MALE);
    /** A Wednesday. */
    private static final LocalDate BEGAN = LocalDate.of(2026, 10, 7);

    @Test
    void theWeekIsTheUsersOwnFromTheDayTheAccountBegan() {
        assertThat(week(BEGAN)).contains(1);
        assertThat(week(BEGAN.plusDays(6))).contains(1);
        assertThat(week(BEGAN.plusDays(7))).contains(2);
        assertThat(week(BEGAN.plusDays(7L * 8 - 1))).contains(8);
        // Past the eighth week the flow is over; before the first day (a time zone moved west) it has not begun.
        assertThat(FirstWeeks.of(facts(BEGAN.plusDays(7L * 8)), MALE)).isEmpty();
        assertThat(FirstWeeks.of(facts(BEGAN.minusDays(1)), MALE)).isEmpty();
    }

    @Test
    void theFirstWeekIsSilentTheOthersHaveTheirContent() {
        // I1 F2: week one only records — no comment, no score.
        assertThat(FirstWeeks.of(facts(BEGAN), MALE).orElseThrow().content()).isEmpty();
        for (int week = 2; week <= 8; week++) {
            assertThat(FirstWeeks.of(facts(BEGAN.plusWeeks(week - 1)), MALE).orElseThrow().content())
                    .contains(new CopyKey("first_weeks.week" + week));
        }
    }

    @Test
    void beforeWeekFiveNoRiskIsReadWhateverTheSignals() {
        for (int week = 1; week < 5; week++) {
            FirstWeeks.Facts quiet = new FirstWeeks.Facts(BEGAN.plusWeeks(week - 1), BEGAN, 0, true, true, 0, 7, false);
            assertThat(FirstWeeks.of(quiet, MALE).orElseThrow().risk()).as("week " + week).isEmpty();
        }
    }

    @Test
    void fromWeekFiveNoSessionLastWeekIsARisk() {
        FirstWeeks.Week week = FirstWeeks.of(new FirstWeeks.Facts(weekFive(), BEGAN, 0, true, false, 7, 7, false), MALE).orElseThrow();

        assertThat(week.risk()).extracting(reason -> reason.rule().value()).containsExactly("no_session_last_week");
        assertThat(week.risk().getFirst().source())
                .isEqualTo(new Source("arastirma/ham/I1-onboarding-aliskanlik.md#F2", SourceTag.LITERATURE));
    }

    @Test
    void noTrainingPlannedIsNoMissedSession() {
        assertThat(FirstWeeks.of(new FirstWeeks.Facts(weekFive(), BEGAN, 0, false, false, 7, 7, false), MALE).orElseThrow().risk()).isEmpty();
    }

    @Test
    void theForgivenWeekUsedIsARisk() {
        // I1 F5: using the forgiveness is the leading sign.
        FirstWeeks.Week week = FirstWeeks.of(new FirstWeeks.Facts(weekFive(), BEGAN, 2, true, true, 7, 7, false), MALE).orElseThrow();
        assertThat(week.risk()).extracting(reason -> reason.rule().value()).containsExactly("forgiven_week_used");
    }

    @Test
    void loggingDroppingUnderAWeeksWorthIsARiskLowBothWeeksIsNot() {
        int enough = MALE.wholeNumber(ParameterKey.MIN_LOGGED_DAYS_PER_WEEK);
        FirstWeeks.Week dropped = FirstWeeks.of(new FirstWeeks.Facts(weekFive(), BEGAN, 2, true, false, enough - 1, enough, false), MALE).orElseThrow();
        assertThat(dropped.risk()).extracting(reason -> reason.rule().value()).containsExactly("logging_dropped");
        // Under it both weeks: no drop, the same habit (the number says so on its own).
        assertThat(FirstWeeks.of(new FirstWeeks.Facts(weekFive(), BEGAN, 2, true, false, 1, enough - 1, false), MALE).orElseThrow().risk()).isEmpty();
        // At it: not dropped under.
        assertThat(FirstWeeks.of(new FirstWeeks.Facts(weekFive(), BEGAN, 2, true, false, enough, 7, false), MALE).orElseThrow().risk()).isEmpty();
    }

    @Test
    void everySignalIsSaidEachOnItsOwnAndNoneIsWeighed() {
        FirstWeeks.Week all = FirstWeeks.of(new FirstWeeks.Facts(weekFive(), BEGAN, 0, true, true, 0, 7, false), MALE).orElseThrow();
        assertThat(all.risk()).extracting(reason -> reason.rule().value())
                .containsExactly("no_session_last_week", "forgiven_week_used", "logging_dropped");
    }

    @Test
    void aWeekPausedByADeclaredStateSignalsNothing() {
        assertThat(FirstWeeks.of(new FirstWeeks.Facts(weekFive(), BEGAN, 0, true, true, 0, 7, true), MALE).orElseThrow().risk()).isEmpty();
    }

    @Test
    void theRiskReadsThroughWeekEight() {
        // G2 K-63: weeks five to eight are the critical window.
        FirstWeeks.Facts eighth = new FirstWeeks.Facts(BEGAN.plusWeeks(7), BEGAN, 0, true, false, 7, 7, false);
        assertThat(FirstWeeks.of(eighth, MALE).orElseThrow().risk()).isNotEmpty();
    }

    private static LocalDate weekFive() {
        return BEGAN.plusWeeks(4);
    }

    private static Optional<Integer> week(LocalDate today) {
        return FirstWeeks.of(facts(today), MALE).map(FirstWeeks.Week::number);
    }

    /** Nothing signalled: sessions and logging on track, nothing forgiven, nothing paused. */
    private static FirstWeeks.Facts facts(LocalDate today) {
        return new FirstWeeks.Facts(today, BEGAN, 2, true, false, 7, 7, false);
    }
}
