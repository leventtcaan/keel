package app.keel.profile;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

/**
 * The adult gate (K-225, ADR-027 #13: nothing that would trouble a launch anywhere): only the birth year is known, so on
 * any day of year T someone born in year B is at least T − B − 1 years old — certainly 18 only when T − B ≥ 19.
 */
class AgeGateTests {

    @Test
    void onlyABirthYearThatMakesTheUserCertainlyAnAdultPasses() {
        LocalDate jan1 = LocalDate.of(2026, 1, 1);
        LocalDate dec30 = LocalDate.of(2026, 12, 30);

        assertThat(AgeGate.certainlyAtLeast(2007, jan1, 18)).as("born 31 Dec 2007: 18 on 1 Jan 2026").isTrue();
        assertThat(AgeGate.certainlyAtLeast(2008, dec30, 18)).as("born 31 Dec 2008: 17 on 30 Dec 2026").isFalse();
        assertThat(AgeGate.certainlyAtLeast(1996, jan1, 18)).isTrue();
        assertThat(AgeGate.certainlyAtLeast(2026, dec30, 18)).isFalse();
    }
}
