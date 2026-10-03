package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.decision.CallFacts;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.constraints.IntRange;
import org.junit.jupiter.api.Test;

/**
 * A reply the model writes is used only when it is the call told (K-505, U1, U2): JSON of exactly {"text"}, within the
 * length, every number one of the call's own, no concession (guards.json), no forbidden phrase or name
 * (forbidden-phrases.json). Anything else is dropped and the coach says what the engine wrote.
 */
class ReplyCheckTests {

    static final CallFacts CUT_STEP = new CallFacts(UUID.randomUUID(), LocalDate.of(2026, 10, 5),
            Map.of("type", "ADJUST_CALORIES", "kcalPerDay", -500), List.of(new CallFacts.Rule("weight_flat_on_plan", "EXPERIENCE")), "MEDIUM",
            LocalDate.of(2026, 10, 12), "decision.adjust_calories.cut", true);

    private static final ReplyCheck CHECK = ReplyCheck.fromClasspath(400);

    private static String reply(String text) {
        return "{\"text\":\"" + text + "\"}";
    }

    @Test
    void theCallToldWithItsOwnNumbersIsUsed() {
        String told = "Your weight has held on the plan, so the call takes 500 kcal a day off. It is looked at again on 12 October 2026.";

        assertThat(CHECK.read(reply(told), CUT_STEP)).contains(told);
    }

    @Test
    void aNumberTheCallDoesNotHaveDropsTheReply() {
        assertThat(CHECK.read(reply("The call takes 400 kcal a day off."), CUT_STEP)).isEmpty();
        assertThat(CHECK.read(reply("Aim for 1,800 kcal a day."), CUT_STEP)).isEmpty();
        assertThat(CHECK.read(reply("Give it 2 more weeks."), CUT_STEP)).isEmpty();
        assertThat(CHECK.read(reply("That is 500.5 kcal."), CUT_STEP)).isEmpty();
    }

    @Test
    void aNumberWithThousandsCommasIsReadWhole() {
        // "1,500" is one number, the call's; read as 1 and 500 it would be dropped for a 1 the call never said.
        CallFacts big = new CallFacts(UUID.randomUUID(), LocalDate.of(2026, 10, 5), Map.of("type", "ADJUST_CALORIES", "kcalPerDay", -1500),
                List.of(), "LOW", LocalDate.of(2026, 10, 12), "decision.adjust_calories.cut", true);

        assertThat(CHECK.read(reply("The call takes 1,500 kcal a day off."), big)).isPresent();
        assertThat(CHECK.read(reply("The call takes 1,600 kcal a day off."), big)).isEmpty();
    }

    @Test
    void theCallSaidAsItsOppositeOrAsNoChangeDropsTheReply() {
        // K-505 review: the call's own number in the other direction, or no number at all (an injected "no change").
        assertThat(CHECK.read(reply("Good news: this week you add 500 kcal a day."), CUT_STEP)).isEmpty();
        assertThat(CHECK.read(reply("No change this week, keep everything the same."), CUT_STEP)).isEmpty();
        assertThat(CHECK.read(reply("The call this week is to eat more."), CUT_STEP)).isEmpty();
        assertThat(CHECK.read(reply("The call takes 500 kcal a day off."), CUT_STEP)).isPresent();
    }

    @Test
    void theReviewDayIsADateNotANumberToUseElsewhere() {
        assertThat(CHECK.read(reply("It is looked at again on the 12th."), CUT_STEP)).isPresent();
        assertThat(CHECK.read(reply("It is looked at again on October 12, 2026."), CUT_STEP)).isPresent();
        assertThat(CHECK.read(reply("Do 12 sets this week."), CUT_STEP)).as("the day, not as a date").isEmpty();
        assertThat(CHECK.read(reply("It is looked at again on 13 October."), CUT_STEP)).as("another day").isEmpty();
        assertThat(CHECK.read(reply("It is looked at again on 12 November."), CUT_STEP)).as("another month").isEmpty();
        assertThat(CHECK.read(reply("It is looked at again on 12 October 2027."), CUT_STEP)).as("another year").isEmpty();
    }

    @Test
    void whatAModelWritesFreelyIsReadAsAPlainText() {
        // Typographic apostrophes, other digits, numbers in words, no-break spaces (K-505 review).
        assertThat(CHECK.read(reply("I\u2019ll lower your calories."), CUT_STEP)).isEmpty();
        assertThat(CHECK.read(reply("Let\u2019s skip the cut this week."), CUT_STEP)).isEmpty();
        assertThat(CHECK.read(reply("I've lowered it for you."), CUT_STEP)).isEmpty();
        assertThat(CHECK.read(reply("Eat \uFF11\uFF19\uFF10\uFF10 kcal."), CUT_STEP)).as("fullwidth").isEmpty();
        assertThat(CHECK.read(reply("Eat \u0661\u0669\u0660\u0660 kcal."), CUT_STEP)).as("Arabic-Indic").isEmpty();
        assertThat(CHECK.read(reply("Eat two thousand kcal."), CUT_STEP)).isEmpty();
        assertThat(CHECK.read(reply("Your body fat is around eighteen percent."), CUT_STEP)).as("U4 in words").isEmpty();
        assertThat(CHECK.read(reply("Your body\u00a0fat % is not what the call reads."), CUT_STEP)).as("U4, a no-break space").isEmpty();
        assertThat(CHECK.read(reply("The call takes 500\u202fkcal a day off."), CUT_STEP)).as("a narrow space is a space").isPresent();
        // Only the folding catches these: a fullwidth letter, and a no-break space inside a concession.
        assertThat(CHECK.read(reply("\uFF29'll lower your calories."), CUT_STEP)).as("fullwidth I").isEmpty();
        assertThat(CHECK.read(reply("I'll\u2028lower your calories."), CUT_STEP)).as("a line separator, which NFKC keeps").isEmpty();
    }

    @Test
    void aConcessionDropsTheReply() {
        assertThat(CHECK.read(reply("Fair enough, I'll lower it to 500 less only next week."), CUT_STEP)).isEmpty();
        assertThat(CHECK.read(reply("You're right, let's skip it."), CUT_STEP)).isEmpty();
    }

    @Test
    void aForbiddenPhraseOrANameDropsTheReply() {
        // No number in them: what drops them is the phrase.
        assertThat(CHECK.read(reply("Your body fat % is not what the call reads."), CUT_STEP)).as("U4").isEmpty();
        assertThat(CHECK.read(reply("The cut helps your insulin resistance."), CUT_STEP)).as("U6").isEmpty();
        assertThat(CHECK.read(reply("Guray says the trend decides."), CUT_STEP)).isEmpty();
    }

    @Test
    void onlyExactlyTheTextFieldWithinTheLength() {
        assertThat(CHECK.read("not json", CUT_STEP)).isEmpty();
        assertThat(CHECK.read("{}", CUT_STEP)).as("the fake told nothing").isEmpty();
        assertThat(CHECK.read("{\"text\":\"The call stands.\",\"kcal\":1800}", CUT_STEP)).as("a field more").isEmpty();
        assertThat(CHECK.read("{\"text\":5}", CUT_STEP)).isEmpty();
        assertThat(CHECK.read(reply(" "), CUT_STEP)).isEmpty();
        assertThat(CHECK.read(reply("a".repeat(401)), CUT_STEP)).isEmpty();
        assertThat(CHECK.read(reply("a".repeat(400)), CUT_STEP)).isPresent();
        assertThat(CHECK.read("[\"The call stands.\"]", CUT_STEP)).isEmpty();
    }

    @Test
    void aFractionOfTheSetsMayBeSaidAsAPercent() {
        CallFacts deload = new CallFacts(UUID.randomUUID(), LocalDate.of(2026, 10, 5), Map.of("type", "DELOAD", "setsFactor", 0.5),
                List.of(), "HIGH", LocalDate.of(2026, 10, 12), "decision.deload", true);

        assertThat(CallNumbers.of(deload)).contains(new java.math.BigDecimal("0.5"), new java.math.BigDecimal("50"));
        assertThat(CHECK.read(reply("This week is 50% of your sets."), deload)).isPresent();
        assertThat(CHECK.read(reply("This week is 60% of your sets."), deload)).isEmpty();
    }

    @Property
    void noNumberOutsideTheCallsEverPasses(@ForAll @IntRange(min = 0, max = 100_000) int number) {
        boolean ownNumber = CallNumbers.of(CUT_STEP).stream().anyMatch(own -> own.compareTo(java.math.BigDecimal.valueOf(number)) == 0);

        assertThat(CHECK.read(reply("The call is " + number + " here."), CUT_STEP).isPresent()).isEqualTo(ownNumber);
    }
}
