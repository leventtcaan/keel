package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

/** The numbers a reply says, however they are written (ADR-092 #2), and when one is a fact's. */
class ReplyNumbersTests {

    private static ReplyNumbers.Fact fact(BigDecimal value) {
        return new ReplyNumbers.Fact(value, ReplyNumbers.Unit.NONE);
    }

    private static List<String> values(String text) {
        return ReplyNumbers.in(text).stream().map(said -> said.value().toPlainString()).toList();
    }

    @Test
    void digitsAreReadAsWritten() {
        assertThat(values("Eat 1,900 kcal, 0.4 kg, 12 weeks.")).containsExactly("1900", "0.4", "12");
        assertThat(values("0,4 kg ve 1,900 kcal")).containsExactly("0.4", "1900");
        assertThat(values("-500 kcal")).containsExactly("500");
        assertThat(values("５００ kcal")).as("fullwidth digits are digits").containsExactly("500");
        assertThat(values("week2 and 3x")).containsExactly("2", "3");
    }

    @Test
    void numberWordsAreNumbersInEnglishAndTurkish() {
        assertThat(values("Two sessions, fifty percent, twice, half.")).containsExactlyInAnyOrder("2", "50", "2", "0.5");
        assertThat(values("Üç gün ve yarım saat.")).containsExactlyInAnyOrder("3", "0.5");
        assertThat(values("TWO hundred")).containsExactly("200");
    }

    @Test
    void wordsThatMerelyContainANumberWordAreNotNumbers() {
        assertThat(values("Stay on the plan; one more week, no one is late. Ten-ish? Often tweezers.")).containsExactly("10");
        assertThat(values("On the plan, a binder, a double-check")).containsExactly("2");
    }

    @Test
    void aPercentSignIsRemembered() {
        assertThat(ReplyNumbers.in("50% and 3 %")).extracting(ReplyNumbers.Said::percent).containsExactly(true, true);
        assertThat(ReplyNumbers.in("50 kg")).extracting(ReplyNumbers.Said::percent).containsExactly(false);
    }

    @Test
    void aNumberIsAFactBySizeOrRoundedToItsOwnDecimals() {
        ReplyNumbers.Said five = new ReplyNumbers.Said(new BigDecimal("500"), false);
        assertThat(ReplyNumbers.matches(five, fact(new BigDecimal("-500")))).isTrue();
        assertThat(ReplyNumbers.matches(five, fact(new BigDecimal("500.4")))).as("rounded to whole").isTrue();
        assertThat(ReplyNumbers.matches(five, fact(new BigDecimal("501")))).isFalse();
        assertThat(ReplyNumbers.matches(new ReplyNumbers.Said(new BigDecimal("0.1"), false), fact(new BigDecimal("0.14")))).isTrue();
        assertThat(ReplyNumbers.matches(new ReplyNumbers.Said(new BigDecimal("0.15"), false), fact(new BigDecimal("0.1")))).as("more decimals than the fact").isFalse();
        assertThat(ReplyNumbers.matches(new ReplyNumbers.Said(new BigDecimal("50"), true), fact(new BigDecimal("0.5")))).as("percent of a fraction").isTrue();
        assertThat(ReplyNumbers.matches(new ReplyNumbers.Said(new BigDecimal("50"), false), fact(new BigDecimal("0.5")))).as("no percent sign").isFalse();
    }
}
