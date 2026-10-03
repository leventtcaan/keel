package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static org.assertj.core.api.Assertions.assertThat;

import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.constraints.IntRange;
import org.junit.jupiter.api.Test;

/**
 * The least that keeps strength and muscle through a busy week (K-524, ADR-038 #7, H9 §2): one session, one set of each
 * exercise at the same load (Bickel 2011's 1/9 dose kept both for 32 weeks in 20-35 year-olds; Rønnestad 2011: once a
 * week held strength in professionals, every other week did not). From busy_min_older_age it is two sessions of two sets:
 * the same dose kept strength but not muscle size at 60-75 (Bickel 2011; Spiering 2021 — low confidence).
 */
class BusyWeekDoseTests {

    private static final Parameters P = parameters(Sex.MALE);
    private static final int OLDER = P.wholeNumber(ParameterKey.BUSY_MIN_OLDER_AGE);

    @Test
    void anAdultUnderTheOlderAgeKeepsWithOneSessionOfOneSetAtTheSameLoad() {
        assertThat(BusyWeekDose.of(30, P)).isEqualTo(new BusyWeekDose(1, 1, true));
        assertThat(BusyWeekDose.of(OLDER - 1, P)).isEqualTo(new BusyWeekDose(1, 1, true));
    }

    @Test
    void fromTheOlderAgeItIsTwoSessionsOfTwoSets() {
        assertThat(BusyWeekDose.of(OLDER, P)).isEqualTo(new BusyWeekDose(2, 2, true));
        assertThat(BusyWeekDose.of(OLDER + 15, P)).isEqualTo(new BusyWeekDose(2, 2, true));
    }

    @Test
    void itRestsOnItsSources() {
        assertThat(BusyWeekDose.REASON.source().tag()).isEqualTo(SourceTag.LITERATURE);
        assertThat(BusyWeekDose.REASON.source().reference()).isEqualTo("arastirma/ham/H9-donus-minimum-doz.md#§2.1");
    }

    @Property
    void neverLessForTheOlderAndNeverNoSessionOrNoSet(@ForAll @IntRange(min = 18, max = 110) int age) {
        BusyWeekDose dose = BusyWeekDose.of(age, P);
        BusyWeekDose younger = BusyWeekDose.of(18, P);

        assertThat(dose.sessions()).isPositive().isGreaterThanOrEqualTo(younger.sessions());
        assertThat(dose.setsPerExercise()).isPositive().isGreaterThanOrEqualTo(younger.setsPerExercise());
        assertThat(dose.keepLoad()).isTrue();
    }
}
