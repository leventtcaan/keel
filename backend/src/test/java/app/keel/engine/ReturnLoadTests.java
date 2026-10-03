package app.keel.engine;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.constraints.BigRange;
import net.jqwik.api.constraints.IntRange;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * Back after a long break (K-531, ADR-043 #75; G7 K-72, H9 §1): a target from a session at least
 * return_step_back_after_weeks ago is one engine step lighter — the region's load step — never below nothing; a shorter
 * break changes nothing.
 */
class ReturnLoadTests {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 3);
    private static final int WEEKS = P.wholeNumber(ParameterKey.RETURN_STEP_BACK_AFTER_WEEKS);

    @Test
    void theBreakIsLongFromItsWeeksOnTheDay() {
        assertThat(ReturnLoad.afterBreak(TODAY.minusDays(WEEKS * 7L - 1), TODAY, P)).isFalse();
        assertThat(ReturnLoad.afterBreak(TODAY.minusDays(WEEKS * 7L), TODAY, P)).isTrue();
        assertThat(ReturnLoad.afterBreak(TODAY.minusDays(WEEKS * 7L + 30), TODAY, P)).isTrue();
    }

    @Test
    void aTargetFromTodayOrLaterIsNoBreak() {
        assertThat(ReturnLoad.afterBreak(TODAY, TODAY, P)).isFalse();
        assertThat(ReturnLoad.afterBreak(TODAY.plusDays(1), TODAY, P)).isFalse();
    }

    @ParameterizedTest
    @CsvSource({"UPPER, 40, 37.5", "LOWER, 100, 95", "UPPER, 2.5, 0", "LOWER, 3, 0", "UPPER, 0, 0"})
    void oneOfTheRegionsStepsLighterNeverBelowNothing(BodyRegion region, BigDecimal last, BigDecimal stepped) {
        assertThat(ReturnLoad.stepBack(last, region, P)).isEqualByComparingTo(stepped);
    }

    @Property
    void neverHeavierNeverNegativeAndAtMostOneStepLighter(@ForAll @BigRange(min = "0", max = "500") BigDecimal last,
            @ForAll BodyRegion region) {
        BigDecimal stepped = ReturnLoad.stepBack(last, region, P);
        BigDecimal step = BigDecimal.valueOf(P.number(region == BodyRegion.UPPER ? ParameterKey.LOAD_INCREMENT_UPPER_KG : ParameterKey.LOAD_INCREMENT_LOWER_KG));
        assertThat(stepped).isLessThanOrEqualTo(last).isGreaterThanOrEqualTo(BigDecimal.ZERO);
        assertThat(last.subtract(stepped)).isLessThanOrEqualTo(step);
    }

    @Property
    void aBreakShorterThanTheWeeksIsNeverOne(@ForAll @IntRange(min = 0, max = 400) int days) {
        assertThat(ReturnLoad.afterBreak(TODAY.minusDays(days), TODAY, P)).isEqualTo(days >= WEEKS * 7);
    }
}
