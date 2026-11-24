package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.decision.CallFacts;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.json.JsonMapper;

/**
 * The reply check against the ways around it that a model (or a person pushing it) may find (ADR-092 #2): characters that cannot be
 * seen, digits of another script, the Turkish way of writing thousands, numbers written as one word, and a true number given the
 * wrong unit. Each test names the rule it holds; take the rule out and it fails.
 */
class ReplyHardeningTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final CallFacts CALL = new CallFacts(UUID.randomUUID(), LocalDate.of(2026, 10, 5),
            Map.of("type", "ADJUST_CALORIES", "kcalPerDay", -500, "stepsPerDay", 8000),
            List.of(new CallFacts.Rule("not_toward_goal", "EXPERIENCE", Map.of("kgPerWeek", 0.1, "weeks", 3))), "MEDIUM", LocalDate.of(2026, 10, 12),
            LocalDate.of(2026, 10, 19), "decision.x", true, Map.of("week", Map.of("training", Map.of("planned", 4, "done", 3, "left", 1))));
    private static final CoachFacts FACTS = CoachFacts.of(CALL);
    private static final ReplyValidator CHECK = new ReplyValidator(400, ForbiddenWords.fromClasspath(), ReplyRules.fromClasspath());

    /** The reply with every number it says listed, as an honest model would: only the check stands between it and the person. */
    private static boolean shown(String text) {
        List<Object> listed = ReplyNumbers.in(text).stream().map(said -> (Object) said.value().doubleValue()).toList();
        String raw = JSON.writeValueAsString(Map.of("reply", text, "topic", "WHY", "numbersUsed", listed));
        return CHECK.read(raw, CALL, FACTS).isPresent();
    }

    @Test
    void anHonestReplyIsStillShown() {
        assertThat(shown("The cut is 500 kcal a day, about 0.1 kg a week over 3 weeks, and 3 of 4 sessions are done.")).isTrue();
        assertThat(shown("Hedef 8.000 adım, bu hafta 3 antrenman yapıldı.")).as("Turkish thousands: 8.000 is eight thousand").isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "Eat 1​900 kcal a day.",            // zero-width space inside the number
        "Eat 1⁠900 kcal a day.",            // word joiner
        "Eat 1­900 kcal a day.",            // soft hyphen
        "Eat ‎1900 kcal a day.",            // left-to-right mark
        "Eat ١٩٠٠ kcal a day.", // Arabic-Indic digits
        "Eat १९०० kcal a day.", // Devanagari digits
        "Eat １９００ kcal a day.", // fullwidth digits
    })
    void aNumberHiddenFromTheEyeIsStillReadAndNotAFact(String text) {
        assertThat(ReplyNumbers.in(text)).extracting(said -> said.value().toPlainString()).contains("1900");
        assertThat(shown(text)).isFalse();
    }

    @Test
    void invisibleCharactersDoNotSplitAForbiddenPhrase() {
        assertThat(ReplyRules.fromClasspath().found("You're ri​ght, I'll lo­wer the cut.")).contains("changes-the-call-en");
        assertThat(ReplyRules.fromClasspath().found("Hak​l­ısın, azal​talım.")).contains("changes-the-call-tr");
        assertThat(Signals.health().found("my kn​ee hu­rts")).contains("pain-injury");
    }

    @Test
    void turkishThousandsAreAnIntegerAndTheDecimalCommaADecimal() {
        assertThat(ReplyNumbers.in("1.900 kcal")).extracting(said -> said.value().toPlainString()).containsExactly("1900");
        assertThat(ReplyNumbers.in("12.500 adım")).extracting(said -> said.value().toPlainString()).containsExactly("12500");
        assertThat(ReplyNumbers.in("1.900.000")).extracting(said -> said.value().toPlainString()).containsExactly("1900000");
        assertThat(ReplyNumbers.in("0,4 kg")).extracting(said -> said.value().toPlainString()).containsExactly("0.4");
        assertThat(ReplyNumbers.in("0.100")).as("a zero first: a decimal").extracting(said -> said.value().toPlainString()).containsExactly("0.100");
        assertThat(shown("Günde 1.900 kalori ye.")).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"Yirmibeş", "yüzelli", "binbeşyüz", "twenty-five", "twenty five", "two hundred and fifty", "one hundred fifty", "twenty five hundred"})
    void aNumberWrittenAsWordsIsReadWhateverItsShape(String words) {
        assertThat(ReplyNumbers.in("Take " + words + " today.")).as(words).hasSize(1);
        assertThat(shown("Take " + words + " today.")).as(words).isFalse();
    }

    @Test
    void compoundNumberWordsHaveTheirValue() {
        for (Map.Entry<String, String> one : Map.of("yirmibeş", "25", "yüzelli", "150", "binbeşyüz", "1500", "ikiyüzelli", "250", "twenty-five", "25",
                "two hundred and fifty", "250", "one hundred", "100", "three thousand two hundred", "3200").entrySet()) {
            assertThat(ReplyNumbers.in(one.getKey())).as(one.getKey()).extracting(said -> said.value().toPlainString()).containsExactly(one.getValue());
        }
        assertThat(ReplyNumbers.in("five six")).as("two numbers, not fifty-six").hasSize(2);
        assertThat(ReplyNumbers.in("no one on the plan, one more week")).as("the pronoun, the preposition and 'one more'").isEmpty();
    }

    @Test
    void aTrueNumberWithTheWrongUnitIsNotAFact() {
        // 3 is a fact (sessions done, and weeks) and 500 is a fact (kcal); neither is the number the unit says.
        assertThat(shown("The cut is 500 kcal a day.")).isTrue();
        assertThat(shown("The cut is 3 kcal a day.")).isFalse();
        assertThat(shown("That is 500 steps a day.")).isFalse();
        assertThat(shown("You walk 8000 steps a day.")).isTrue();
        assertThat(shown("About 3 kg a week.")).isFalse();
        assertThat(shown("About 0.1 kg a week.")).isTrue();
        assertThat(shown("Over 3 weeks.")).isTrue();
        assertThat(shown("Over 4 weeks.")).as("4 is the sessions planned, not weeks").isFalse();
        assertThat(shown("3 of 4 sessions are done.")).isTrue();
        assertThat(shown("Bu hafta 500 adım yürü.")).isFalse();
        assertThat(shown("Günlük 500 kalori.")).isTrue();
        assertThat(shown("3 kalori eksik.")).isFalse();
    }

    @Test
    void theFactsKnowWhatTheyCount() {
        assertThat(FACTS.facts()).contains(new ReplyNumbers.Fact(new BigDecimal("-500"), ReplyNumbers.Unit.KCAL),
                new ReplyNumbers.Fact(new BigDecimal("8000"), ReplyNumbers.Unit.STEPS), new ReplyNumbers.Fact(new BigDecimal("0.1"), ReplyNumbers.Unit.KG),
                new ReplyNumbers.Fact(new BigDecimal("3"), ReplyNumbers.Unit.WEEKS), new ReplyNumbers.Fact(new BigDecimal("3"), ReplyNumbers.Unit.NONE));
    }
}
