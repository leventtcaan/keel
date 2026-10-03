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
            LocalDate.of(2026, 10, 12), "decision.adjust_calories.cut", false);

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
                List.of(), "HIGH", LocalDate.of(2026, 10, 12), "decision.deload", false);

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
