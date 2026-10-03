package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/**
 * The first eight weeks (K-513, ADR-040; 04 §7.5, I1 F2): the user's own week since the account began, each with its
 * content — the first silent, a version without lifting for someone who does not train — and the risk: read once the
 * user's week just over is week five to eight (G2 K-63), so the ninth week opens for it alone. Any of that week's signals
 * (no session, the forgiven week used, logging dropped) is a risk, none weighed against another (no source gives weights,
 * U14).
 */
class FirstWeeksTests {

    private static final Parameters MALE = parameters(Sex.MALE);
    /** A Wednesday: the user's weeks run Wednesday to Tuesday, so they never line up with the calendar's. */
    private static final LocalDate BEGAN = LocalDate.of(2026, 10, 7);
    private static final FirstWeeks.UserWeek ON_TRACK = new FirstWeeks.UserWeek(2, 7, false);

    @Test
    void theAccountBeganOnAWednesday() {
        assertThat(BEGAN.getDayOfWeek()).isEqualTo(DayOfWeek.WEDNESDAY);
    }

    // ── the week ────────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void theWeekIsTheUsersOwnFromTheDayTheAccountBegan() {
        assertThat(number(BEGAN)).contains(1);
        assertThat(number(BEGAN.plusDays(6))).contains(1);
        assertThat(number(BEGAN.plusDays(7))).contains(2);
        assertThat(number(BEGAN.plusDays(7L * 8 - 1))).contains(8);
        // The ninth week is open only to read the eighth's risk; past it the flow is over; before the first day (a time
        // zone moved west) it has not begun.
        assertThat(number(BEGAN.plusDays(7L * 8))).contains(9);
        assertThat(FirstWeeks.of(quiet(BEGAN.plusDays(7L * 9)), MALE)).isEmpty();
        assertThat(FirstWeeks.of(quiet(BEGAN.minusDays(1)), MALE)).isEmpty();
    }

    @Test
    void theWeekStartsOnTheDayOfTheWeekTheAccountBegan() {
        // The server reads the user's week just over from here: the seven days before it.
        assertThat(FirstWeeks.weekStart(BEGAN, BEGAN.plusDays(40))).isEqualTo(BEGAN.plusDays(35));
        assertThat(FirstWeeks.weekStart(BEGAN, BEGAN.plusDays(35))).isEqualTo(BEGAN.plusDays(35));
        assertThat(FirstWeeks.weekStart(BEGAN, BEGAN)).isEqualTo(BEGAN);
    }

    // ── the content ─────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void theFirstWeekIsSilentTheOthersHaveTheirContentTheNinthOnlyItsRisk() {
        // I1 F2: week one only records — no comment, no score.
        assertThat(week(quiet(BEGAN)).content()).isEmpty();
        for (int n = 2; n <= 8; n++) {
            assertThat(week(quiet(weekStarting(n))).content()).as("week " + n).contains(new CopyKey("first_weeks.week" + n));
        }
        assertThat(week(quiet(weekStarting(9))).content()).isEmpty();
    }

    @Test
    void someoneWhoDoesNotTrainGetsTheVersionWithoutLifting() {
        for (int n = 2; n <= 8; n++) {
            FirstWeeks.Facts facts = new FirstWeeks.Facts(weekStarting(n), BEGAN, false, ON_TRACK, 7, List.of());
            assertThat(week(facts).content()).as("week " + n).contains(new CopyKey("first_weeks.no_training.week" + n));
        }
    }

    @Test
    void everyWeeksContentHasWords() {
        for (boolean trains : List.of(true, false)) {
            for (int n = 2; n <= MALE.wholeNumber(ParameterKey.FIRST_WEEKS); n++) {
                CopyKey content = week(new FirstWeeks.Facts(weekStarting(n), BEGAN, trains, ON_TRACK, 7, List.of())).content().orElseThrow();
                assertThat(EngineFixtures.copyGroup(content)).as(content.value()).containsKeys("title", "body");
            }
        }
    }

    @Test
    void withoutTrainingNoWeekSpeaksOfLiftingOrMuscle() {
        for (int n = 2; n <= 8; n++) {
            String words = words(new CopyKey("first_weeks.no_training.week" + n));
            assertThat(words).as("week " + n).doesNotContain("lift", "muscle", "strength", "nervous", "session", "move");
        }
    }

    @Test
    void muscleIsFirstSpokenOfInWeekSixAndOnlyAsAMay() {
        // I1 F2: "muscle" is first said in week six, as becoming measurable. Week four may say what it is not yet.
        for (int n = 2; n <= 5; n++) {
            assertThat(words(new CopyKey("first_weeks.week" + n)).replace("not muscle yet", "")).as("week " + n).doesNotContain("muscle");
        }
        String six = words(new CopyKey("first_weeks.week6"));
        assertThat(six).contains("muscle", "may").doesNotContain("will");
    }

    // ── the risk ────────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void theRiskIsReadOnceTheUsersWeekJustOverIsWeekFiveToEight() {
        // G2 K-63: weeks five to eight are the critical window; their behaviour is read in the week after each.
        for (int n = 1; n <= 9; n++) {
            FirstWeeks.Facts everything = new FirstWeeks.Facts(weekStarting(n), BEGAN, true, new FirstWeeks.UserWeek(0, 0, false), 7, List.of());
            if (n <= 5) {
                assertThat(week(everything).risk()).as("week " + n).isEmpty();
            } else {
                assertThat(week(everything).risk()).as("week " + n).isNotEmpty();
            }
        }
    }

    @Test
    void noSessionInTheUsersWeekJustOverIsARisk() {
        FirstWeeks.Week week = week(new FirstWeeks.Facts(weekStarting(6), BEGAN, true, new FirstWeeks.UserWeek(0, 7, false), 7, List.of()));

        assertThat(rules(week)).containsExactly("no_session_last_week");
        assertThat(week.risk().getFirst().source())
                .isEqualTo(new Source("arastirma/ham/I1-onboarding-aliskanlik.md#F2", SourceTag.LITERATURE));
    }

    @Test
    void noTrainingPlannedIsNoMissedSession() {
        assertThat(week(new FirstWeeks.Facts(weekStarting(6), BEGAN, false, new FirstWeeks.UserWeek(0, 7, false), 7, List.of())).risk())
                .isEmpty();
    }

    @Test
    void theForgivenWeekIsTheCalendarWeekThatEndedInsideTheUsersWeekJustOver() {
        // I1 F3: using the forgiveness is the leading sign. Consistency forgives calendar weeks (Monday to Sunday, the
        // number the user sees); the user's seven days hold exactly one Sunday, so exactly one calendar week ends in them.
        LocalDate today = weekStarting(6);
        assertThat(rules(week(new FirstWeeks.Facts(today, BEGAN, true, ON_TRACK, 7, calendar(today, 9, 2)))))
                .containsExactly("forgiven_week_used");
    }

    @Test
    void theCalendarWeekRunningNowIsNotRead() {
        // Its miss belongs to the user's week running now, read next week.
        LocalDate today = weekStarting(6);
        List<WeekTally> withNow = new ArrayList<>(calendar(today, 9, 9));
        withNow.add(training(withNow.getLast().weekStart().plusWeeks(1), 2));
        assertThat(week(new FirstWeeks.Facts(today, BEGAN, true, ON_TRACK, 7, withNow)).risk()).isEmpty();
        // And the week just over is still read past it: forgiven, then a week on track running now.
        List<WeekTally> forgivenThenNow = new ArrayList<>(calendar(today, 9, 2));
        forgivenThenNow.add(training(forgivenThenNow.getLast().weekStart().plusWeeks(1), 9));
        assertThat(rules(week(new FirstWeeks.Facts(today, BEGAN, true, ON_TRACK, 7, forgivenThenNow)))).containsExactly("forgiven_week_used");
    }

    @Test
    void consistencysWeeksStoppingShortOfTheWeekJustOverAreRefused() {
        // A caller's slip, not a quiet week: it would switch the signal off for everyone.
        LocalDate today = weekStarting(6);
        List<WeekTally> shortOfIt = calendar(today, 9, 2, 9).subList(0, 2);
        assertThatThrownBy(() -> FirstWeeks.of(new FirstWeeks.Facts(today, BEGAN, true, ON_TRACK, 7, shortOfIt), MALE))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void consistencysWeeksBeginningAfterTheWeekJustOverSayNothingOfIt() {
        // No consistency record yet, or one that began later (the first call): nothing was forgiven then.
        LocalDate today = weekStarting(6);
        List<WeekTally> later = new ArrayList<>(calendar(today, 9));
        later.set(0, training(later.getFirst().weekStart().plusWeeks(1), 2));
        assertThat(week(new FirstWeeks.Facts(today, BEGAN, true, ON_TRACK, 7, later)).risk()).isEmpty();
        assertThat(week(new FirstWeeks.Facts(today, BEGAN, true, ON_TRACK, 7, List.of())).risk()).isEmpty();
    }

    @Test
    void whateverTheDayTheAccountBeganTheCalendarWeekEndingInsideTheUsersWeekIsRead() {
        // Begun on a Monday the user's week is the calendar's; begun on a Sunday its first day is the calendar week's last.
        for (DayOfWeek day : DayOfWeek.values()) {
            LocalDate began = BEGAN.with(TemporalAdjusters.nextOrSame(day));
            LocalDate today = began.plusWeeks(5);
            LocalDate sunday = today.minusDays(1).with(TemporalAdjusters.previousOrSame(DayOfWeek.SUNDAY));
            List<WeekTally> forgiven = List.of(training(sunday.minusDays(13), 9), training(sunday.minusDays(6), 2));
            assertThat(rules(FirstWeeks.of(new FirstWeeks.Facts(today, began, true, ON_TRACK, 7, forgiven), MALE).orElseThrow()))
                    .as(day.toString()).containsExactly("forgiven_week_used");
        }
    }

    @Test
    void aMissWithNoRunBeforeItIsNoForgivenWeek() {
        LocalDate today = weekStarting(6);
        assertThat(week(new FirstWeeks.Facts(today, BEGAN, true, ON_TRACK, 7, calendar(today, 2))).risk()).isEmpty();
    }

    @Test
    void loggingDroppingUnderAWeeksWorthIsARiskLowBothWeeksIsNot() {
        int enough = MALE.wholeNumber(ParameterKey.MIN_LOGGED_DAYS_PER_WEEK);
        LocalDate today = weekStarting(6);
        assertThat(rules(week(new FirstWeeks.Facts(today, BEGAN, true, new FirstWeeks.UserWeek(2, enough - 1, false), enough, List.of()))))
                .containsExactly("logging_dropped");
        // Under it both weeks: no drop, the same habit (the number says so on its own).
        assertThat(week(new FirstWeeks.Facts(today, BEGAN, true, new FirstWeeks.UserWeek(2, 1, false), enough - 1, List.of())).risk()).isEmpty();
        // At it: not dropped under.
        assertThat(week(new FirstWeeks.Facts(today, BEGAN, true, new FirstWeeks.UserWeek(2, enough, false), 7, List.of())).risk()).isEmpty();
    }

    @Test
    void everySignalIsSaidEachOnItsOwnAndNoneIsWeighed() {
        LocalDate today = weekStarting(6);
        FirstWeeks.Week all = week(new FirstWeeks.Facts(today, BEGAN, true, new FirstWeeks.UserWeek(0, 0, false), 7, calendar(today, 9, 2)));
        assertThat(rules(all)).containsExactly("no_session_last_week", "forgiven_week_used", "logging_dropped");
    }

    @Test
    void aWeekPausedByADeclaredStateSignalsNothing() {
        LocalDate today = weekStarting(6);
        assertThat(week(new FirstWeeks.Facts(today, BEGAN, true, new FirstWeeks.UserWeek(0, 0, true), 7, calendar(today, 9, 2))).risk())
                .isEmpty();
    }

    // ── helpers ─────────────────────────────────────────────────────────────────────────────────────────────

    private static LocalDate weekStarting(int n) {
        return BEGAN.plusWeeks(n - 1);
    }

    private static FirstWeeks.Week week(FirstWeeks.Facts facts) {
        return FirstWeeks.of(facts, MALE).orElseThrow();
    }

    private static Optional<Integer> number(LocalDate today) {
        return FirstWeeks.of(quiet(today), MALE).map(FirstWeeks.Week::number);
    }

    /** Nothing signalled: sessions and logging on track, nothing forgiven, nothing paused. */
    private static FirstWeeks.Facts quiet(LocalDate today) {
        return new FirstWeeks.Facts(today, BEGAN, true, ON_TRACK, 7, List.of());
    }

    private static List<String> rules(FirstWeeks.Week week) {
        return week.risk().stream().map(reason -> reason.rule().value()).toList();
    }

    /**
     * Consecutive calendar weeks of training, ten planned each, {@code done} as given, oldest first; the last is the calendar
     * week that ends on the Sunday inside the user's week just over.
     */
    private static List<WeekTally> calendar(LocalDate today, int... done) {
        LocalDate lastDayOfUsersWeekJustOver = FirstWeeks.weekStart(BEGAN, today).minusDays(1);
        LocalDate sunday = lastDayOfUsersWeekJustOver.with(TemporalAdjusters.previousOrSame(DayOfWeek.SUNDAY));
        LocalDate first = sunday.minusDays(6).minusWeeks(done.length - 1L);
        List<WeekTally> weeks = new ArrayList<>();
        for (int i = 0; i < done.length; i++) {
            weeks.add(training(first.plusWeeks(i), done[i]));
        }
        return weeks;
    }

    private static WeekTally training(LocalDate monday, int done) {
        ActionTally none = new ActionTally(0, 0);
        return new WeekTally(monday, new ActionTally(10, done), none, none, none);
    }

    private static String words(CopyKey key) {
        Map<String, Object> group = EngineFixtures.copyGroup(key);
        return (group.get("title") + " " + group.get("body")).toLowerCase(Locale.ROOT);
    }
}
