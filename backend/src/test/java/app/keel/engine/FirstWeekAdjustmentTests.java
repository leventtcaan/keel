package app.keel.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.keel.engine.CheckIn.Week1Feel;
import app.keel.engine.FirstWeekAdjustment.Week;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

/**
 * The first week's one adjustment (K-962, ADR-077 #4, R4): from the sessions planned and done in week 1 and how it felt —
 * the same plan, one more training day, or the missed sessions moved to days that fit. No weight, no calories (U8). The
 * thresholds are read from the parameter files; the expected calls are written out.
 */
class FirstWeekAdjustmentTests {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static final LocalDate MONDAY = LocalDate.of(2026, 10, 12);
    private static final BigDecimal ON_TRACK = BigDecimal.valueOf(P.number(ParameterKey.ON_TRACK_MIN_RATIO));
    private static final int IDEAL = P.wholeNumber(ParameterKey.TRAINING_DAYS_IDEAL_MIN);
    private static final int FLOOR = P.wholeNumber(ParameterKey.TRAINING_DAYS_MIN);
    private static final Optional<Experience> ONE_TO_THREE_YEARS = Optional.of(Experience.Y1_3);

    // Ten planned sessions put the ratio's line on a whole session: done at, just under and just over it.
    private static final int TEN = 10;
    private static final int AT_THE_LINE = ON_TRACK.multiply(BigDecimal.valueOf(TEN)).intValueExact();

    @Test
    void everySessionDoneAndAboutRightKeepsThePlan() {
        Decision call = decide(week(3, 3, 3, List.of(), ONE_TO_THREE_YEARS), Week1Feel.ABOUT_RIGHT);

        assertThat(call.action()).isEqualTo(new Action.Continue());
        assertThat(call.reasons()).extracting(Reason::rule).containsExactly(new RuleId("first_week_on_track"));
        assertThat(call.reasons().getFirst().source()).isEqualTo(new Source("arastirma/ham/guray/G2-kilo-verme.md#K-60", SourceTag.EXPERIENCE));
        assertThat(call.copyKey()).isEqualTo(new CopyKey("decision.continue.first_week_on_track"));
        assertThat(call.confidence()).isEqualTo(Confidence.MEDIUM);
        assertThat(call.nextReview()).isEqualTo(MONDAY.plusDays(7));
    }

    @Test
    void tooMuchKeepsThePlanAndIsSaidBack() {
        // The feel answer is reflected (ADR-077 #4): "too much" has its own words, the plan stays all the same (U7).
        Week allDone = week(3, 3, 3, List.of(), ONE_TO_THREE_YEARS);
        Decision tooMuch = decide(allDone, Week1Feel.TOO_MUCH);

        assertThat(tooMuch.action()).isEqualTo(new Action.Continue());
        assertThat(tooMuch.reasons()).extracting(Reason::rule).containsExactly(new RuleId("first_week_on_track"));
        assertThat(tooMuch.copyKey()).isEqualTo(new CopyKey("decision.continue.first_week_too_much"));
        assertThat(decide(allDone, Week1Feel.UNKNOWN)).as("not answered: the about-right words").isEqualTo(decide(allDone, Week1Feel.ABOUT_RIGHT));
    }

    @Test
    void whereTheFeelIsNotAskedAnAnswerIsNotRead() {
        // A beginner is not asked; an answer sent all the same changes neither the call nor its words.
        Week beginner = week(3, 3, 3, List.of(), Optional.of(Experience.NEW));

        assertThat(decide(beginner, Week1Feel.TOO_MUCH)).isEqualTo(decide(beginner, Week1Feel.UNKNOWN));
        assertThat(decide(beginner, Week1Feel.UNKNOWN).copyKey()).isEqualTo(new CopyKey("decision.continue.first_week_on_track"));
    }

    @Test
    void atTheOnTrackLineThePlanStays() {
        Decision call = decide(week(TEN, AT_THE_LINE, 5, missedOf(TEN - AT_THE_LINE), ONE_TO_THREE_YEARS), Week1Feel.UNKNOWN);

        assertThat(call.action()).isEqualTo(new Action.Continue());
        assertThat(decide(week(TEN, AT_THE_LINE + 1, 5, missedOf(TEN - AT_THE_LINE - 1), ONE_TO_THREE_YEARS), Week1Feel.UNKNOWN).action())
                .as("just over the line").isEqualTo(new Action.Continue());
    }

    @Test
    void underTheOnTrackLineTheMissedSessionsMoveAndTheDaysStay() {
        List<DayOfWeek> missed = missedOf(TEN - AT_THE_LINE + 1);
        Decision call = decide(week(TEN, AT_THE_LINE - 1, 5, missed, ONE_TO_THREE_YEARS), Week1Feel.UNKNOWN);

        assertThat(call.action()).isEqualTo(new Action.MoveMissedSessions(missed));
        assertThat(call.reasons()).extracting(Reason::rule).containsExactly(new RuleId("first_week_move_missed"));
        assertThat(call.reasons().getFirst().source())
                .isEqualTo(new Source("arastirma/03-guray-karar-omurgasi.md#2.9", SourceTag.EXPERIENCE));
        assertThat(call.copyKey()).isEqualTo(new CopyKey("decision.move_missed_sessions.first_week_move_missed"));
        assertThat(call.confidence()).isEqualTo(Confidence.MEDIUM);
    }

    @Test
    void twoOfThreeIsUnderTheLineSoWednesdayMoves() {
        // ADR-071 #8: the old "3 days, not 2" suggestion is gone; the missed Wednesday moves, three days stay.
        Decision call = decide(week(3, 2, 3, List.of(DayOfWeek.WEDNESDAY), ONE_TO_THREE_YEARS), Week1Feel.UNKNOWN);

        assertThat(call.action()).isEqualTo(new Action.MoveMissedSessions(List.of(DayOfWeek.WEDNESDAY)));
    }

    @Test
    void everySessionDoneAndCouldDoMoreAddsADayBelowTheIdeal() {
        Decision call = decide(week(3, 3, IDEAL - 1, List.of(), ONE_TO_THREE_YEARS), Week1Feel.COULD_DO_MORE);

        assertThat(call.action()).isEqualTo(new Action.AddTrainingDay(IDEAL, IDEAL));
        assertThat(call.reasons()).extracting(Reason::rule).containsExactly(new RuleId("first_week_add_day"));
        assertThat(call.reasons().getFirst().source()).isEqualTo(new Source("arastirma/ham/guray/G6-eski-arsiv.md#K-36", SourceTag.EXPERIENCE));
        assertThat(call.copyKey()).isEqualTo(new CopyKey("decision.add_training_day.first_week_add_day"));
        assertThat(call.confidence()).isEqualTo(Confidence.MEDIUM);
    }

    @Test
    void atOrOverTheIdealNoDayIsAdded() {
        assertThat(decide(week(4, 4, IDEAL, List.of(), ONE_TO_THREE_YEARS), Week1Feel.COULD_DO_MORE).action()).isEqualTo(new Action.Continue());
        assertThat(decide(week(5, 5, IDEAL + 1, List.of(), ONE_TO_THREE_YEARS), Week1Feel.COULD_DO_MORE).action()).isEqualTo(new Action.Continue());
    }

    @Test
    void aBeginnerGetsNoAddedDay() {
        // G6 K-36: three days are enough for someone starting out (ADR-072 #3).
        assertThat(decide(week(3, 3, 3, List.of(), Optional.of(Experience.NEW)), Week1Feel.COULD_DO_MORE).action()).isEqualTo(new Action.Continue());
    }

    @Test
    void anUnknownExperienceGetsNoAddedDay() {
        // "Only for the non-beginner": without the answer the engine cannot know, so it does not suggest it.
        assertThat(decide(week(3, 3, 3, List.of(), Optional.empty()), Week1Feel.COULD_DO_MORE).action()).isEqualTo(new Action.Continue());
    }

    @ParameterizedTest
    @EnumSource(value = Experience.class, names = {"UNDER_1Y", "Y1_3", "Y3_PLUS"})
    void anyoneNotStartingOutGetsTheAddedDay(Experience experience) {
        assertThat(decide(week(3, 3, 3, List.of(), Optional.of(experience)), Week1Feel.COULD_DO_MORE).action()).isEqualTo(new Action.AddTrainingDay(4, IDEAL));
    }

    @Test
    void notEverySessionDoneGetsNoAddedDayEvenOnTrack() {
        Decision call = decide(week(4, 3, 4 - 1, List.of(DayOfWeek.FRIDAY), ONE_TO_THREE_YEARS), Week1Feel.COULD_DO_MORE);

        assertThat(call.action()).isEqualTo(new Action.Continue());
    }

    @Test
    void anExtraSessionCountsAsAllDone() {
        // A session on a day off is still a session: done over planned is all of it.
        assertThat(decide(week(3, 4, 3, List.of(), ONE_TO_THREE_YEARS), Week1Feel.COULD_DO_MORE).action()).isEqualTo(new Action.AddTrainingDay(4, IDEAL));
    }

    @Test
    void twoChosenDaysAddedToAreNeverUnderTheFloor() {
        // ADR-071 #8: two days are only the user's own choice; one more lands on the floor, not under it.
        Action added = decide(week(2, 2, 2, List.of(), ONE_TO_THREE_YEARS), Week1Feel.COULD_DO_MORE).action();

        assertThat(added).isEqualTo(new Action.AddTrainingDay(3, IDEAL));
        assertThat(((Action.AddTrainingDay) added).toDays()).isGreaterThanOrEqualTo(FLOOR);
    }

    @Test
    void nothingPlannedInTheWeekGivesNoAdjustment() {
        // An account begun the day before its check-in day, or a plan without training: nothing to adjust (U3).
        assertThat(FirstWeekAdjustment.decide(week(0, 0, 3, List.of(), ONE_TO_THREE_YEARS), Week1Feel.UNKNOWN, MONDAY, P)).isEmpty();
        assertThat(FirstWeekAdjustment.decide(week(0, 1, 0, List.of(), ONE_TO_THREE_YEARS), Week1Feel.COULD_DO_MORE, MONDAY, P)).isEmpty();
    }

    @Test
    void theFeelIsAskedOnlyWhenItsAnswerCouldAddTheDay() {
        assertThat(FirstWeekAdjustment.feelCounts(week(3, 3, 3, List.of(), ONE_TO_THREE_YEARS), P)).isTrue();
        assertThat(FirstWeekAdjustment.feelCounts(week(3, 2, 3, List.of(DayOfWeek.MONDAY), ONE_TO_THREE_YEARS), P)).as("not all done").isFalse();
        assertThat(FirstWeekAdjustment.feelCounts(week(3, 3, 3, List.of(), Optional.of(Experience.NEW)), P)).as("starting out").isFalse();
        assertThat(FirstWeekAdjustment.feelCounts(week(3, 3, 3, List.of(), Optional.empty()), P)).as("experience unknown").isFalse();
        assertThat(FirstWeekAdjustment.feelCounts(week(4, 4, IDEAL, List.of(), ONE_TO_THREE_YEARS), P)).as("at the ideal").isFalse();
        assertThat(FirstWeekAdjustment.feelCounts(week(0, 0, 3, List.of(), ONE_TO_THREE_YEARS), P)).as("nothing planned").isFalse();
    }

    @Test
    void aWeekIsCountsThatAddUp() {
        assertThatThrownBy(() -> week(-1, 0, 3, List.of(), ONE_TO_THREE_YEARS)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> week(3, -1, 3, List.of(), ONE_TO_THREE_YEARS)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> week(3, 3, -1, List.of(), ONE_TO_THREE_YEARS)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> week(1, 0, 3, List.of(DayOfWeek.MONDAY, DayOfWeek.FRIDAY), ONE_TO_THREE_YEARS))
                .as("more days missed than planned").isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> week(3, 1, 3, List.of(DayOfWeek.MONDAY, DayOfWeek.MONDAY), ONE_TO_THREE_YEARS))
                .as("a day missed twice").isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> week(3, 1, 3, List.of(DayOfWeek.MONDAY), ONE_TO_THREE_YEARS))
                .as("a planned day neither done nor missed").isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void movingNeedsAMissedDay() {
        assertThatThrownBy(() -> new Action.MoveMissedSessions(List.of())).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Action.AddTrainingDay(0, 4)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Action.AddTrainingDay(5, 4)).as("past the ideal").isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void everyCallHasItsWordsAndItsRuleSentence() {
        List<Decision> calls = List.of(decide(week(3, 3, 3, List.of(), ONE_TO_THREE_YEARS), Week1Feel.ABOUT_RIGHT),
                decide(week(3, 3, 3, List.of(), ONE_TO_THREE_YEARS), Week1Feel.TOO_MUCH),
                decide(week(3, 3, 3, List.of(), ONE_TO_THREE_YEARS), Week1Feel.COULD_DO_MORE),
                decide(week(3, 1, 3, List.of(DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY), ONE_TO_THREE_YEARS), Week1Feel.UNKNOWN));
        for (Decision call : calls) {
            assertThat(EngineFixtures.copyGroup(call.copyKey())).as(call.copyKey().value()).containsKeys("title", "body");
        }
        // The missed days are said back ("Wednesday didn't happen"), the feel answer too ("You said you could do more").
        assertThat(EngineFixtures.copyGroup(new CopyKey("decision.move_missed_sessions.first_week_move_missed")).get("missed"))
                .asString().contains("{days}");
        // The added day points toward the ideal, never calling the new count itself ideal (2 to 3 is still one day).
        Map<String, Object> added = EngineFixtures.copyGroup(new CopyKey("decision.add_training_day.first_week_add_day"));
        assertThat(added.get("toward")).asString().contains("{idealDays}");
        assertThat(String.join(" ", added.get("title").toString(), added.get("body").toString())).doesNotContain("works best");
    }

    // K-1000 (ADR-077 Ek 1, Ek 3): the call comes with the days it suggests, none a training day already.
    private static final List<DayOfWeek> MON_WED_FRI = List.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY);

    @Test
    void aMissedSessionIsSuggestedOnTheFirstFreeDayAfterIt() {
        Week week = new Week(3, 1, 3, List.of(DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY), ONE_TO_THREE_YEARS, MON_WED_FRI);

        Action.MoveMissedSessions move = (Action.MoveMissedSessions) decide(week, Week1Feel.UNKNOWN).action();

        assertThat(move.missed()).containsExactly(DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY);
        assertThat(move.suggested()).as("Wednesday → Thursday, Friday → Saturday").containsExactly(DayOfWeek.THURSDAY, DayOfWeek.SATURDAY);
    }

    @Test
    void withNoFreeDayLaterInTheWeekTheWeeksFirstFreeDayIsSuggestedAndNoDayTwice() {
        List<DayOfWeek> days = List.of(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY);
        Week week = new Week(5, 1, 5, List.of(DayOfWeek.MONDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY), ONE_TO_THREE_YEARS, days);

        Action.MoveMissedSessions move = (Action.MoveMissedSessions) decide(week, Week1Feel.UNKNOWN).action();

        // Free: Wednesday, Thursday. Monday → Wednesday; Friday has none after it → the week's first free day not taken,
        // Thursday; nothing is left for Saturday and Sunday: never a day twice, never a training day.
        assertThat(move.suggested()).containsExactly(DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY);
    }

    @Test
    void anAddedDayIsSuggestedWhereItHasTheMostRestOnBothSides() {
        Week twoDays = new Week(2, 2, 2, List.of(), ONE_TO_THREE_YEARS, List.of(DayOfWeek.MONDAY, DayOfWeek.THURSDAY));
        Week mwf = new Week(3, 3, 3, List.of(), ONE_TO_THREE_YEARS, MON_WED_FRI);

        Action.AddTrainingDay fromTwo = (Action.AddTrainingDay) decide(twoDays, Week1Feel.COULD_DO_MORE).action();
        Action.AddTrainingDay fromThree = (Action.AddTrainingDay) decide(mwf, Week1Feel.COULD_DO_MORE).action();

        // Monday and Thursday: Saturday is two days from Thursday and two from Monday (the week goes round), the most rest
        // on both sides; every other free day is next to one. One day for each added (toDays − the days there are).
        assertThat(fromTwo.suggested()).hasSize(fromTwo.toDays() - 2).first().isEqualTo(DayOfWeek.SATURDAY);
        // Monday, Wednesday, Friday: every free day is next to a training day; on the tie, the earliest, Tuesday.
        assertThat(fromThree.suggested()).containsExactly(DayOfWeek.TUESDAY);
    }

    @Test
    void withoutTheTrainingWeekdaysNothingIsSuggested() {
        Action.MoveMissedSessions move = (Action.MoveMissedSessions) decide(week(3, 1, 3, List.of(DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY), ONE_TO_THREE_YEARS),
                Week1Feel.UNKNOWN).action();

        assertThat(move.suggested()).isEmpty();
    }

    private static Decision decide(Week week, Week1Feel feel) {
        return FirstWeekAdjustment.decide(week, feel, MONDAY, P).orElseThrow();
    }

    private static Week week(int planned, int done, int trainingDays, List<DayOfWeek> missed, Optional<Experience> experience) {
        return new Week(planned, done, trainingDays, missed, experience);
    }

    private static List<DayOfWeek> missedOf(int count) {
        return List.of(DayOfWeek.values()).subList(0, count);
    }
}
