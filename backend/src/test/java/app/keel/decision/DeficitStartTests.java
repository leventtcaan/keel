package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.Phase;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

/** The first day of the cut's deficit (ADR-039 T-2): its first target under maintenance — not the watch before it. */
class DeficitStartTests {

    private static final LocalDate CUT_BEGAN = LocalDate.of(2026, 9, 1);
    private static final CallStore.Plan WATCHED = new CallStore.Plan(Phase.CUT, CUT_BEGAN, CUT_BEGAN, 2600, true, null);

    @Test
    void aCutStillWatchedAtMaintenanceHasNoDeficitYet() {
        assertThat(DeficitStart.of(WATCHED, List.of())).isEmpty();
    }

    @Test
    void theFirstCalorieCallUnderMaintenanceBeginsIt() {
        CallStore.Plan first = under(LocalDate.of(2026, 9, 15), 2300);
        assertThat(DeficitStart.of(first, List.of(step(1, WATCHED, first)))).contains(LocalDate.of(2026, 9, 15));
    }

    @Test
    void aLaterStepDownTheLadderIsTheSameDeficit() {
        CallStore.Plan first = under(LocalDate.of(2026, 9, 15), 2300);
        CallStore.Plan second = under(LocalDate.of(2026, 9, 29), 2100);
        assertThat(DeficitStart.of(second, List.of(step(1, WATCHED, first), step(2, first, second)))).contains(LocalDate.of(2026, 9, 15));
    }

    @Test
    void theSameCutBegunAgainWatchedStartsANewDeficit() {
        CallStore.Plan first = under(LocalDate.of(2026, 9, 15), 2300);
        CallStore.Plan watchedAgain = new CallStore.Plan(Phase.CUT, CUT_BEGAN, LocalDate.of(2026, 10, 1), 2500, true, null);
        CallStore.Plan again = under(LocalDate.of(2026, 10, 13), 2250);
        List<CallStore.PlanStep> steps = List.of(step(1, WATCHED, first), step(2, first, watchedAgain), step(3, watchedAgain, again));
        assertThat(DeficitStart.of(again, steps)).contains(LocalDate.of(2026, 10, 13));
    }

    @Test
    void watchedAgainThereIsNoDeficitUntilTheNextCall() {
        CallStore.Plan first = under(LocalDate.of(2026, 9, 15), 2300);
        CallStore.Plan watchedAgain = new CallStore.Plan(Phase.CUT, CUT_BEGAN, LocalDate.of(2026, 10, 1), 2500, true, null);
        assertThat(DeficitStart.of(watchedAgain, List.of(step(1, WATCHED, first), step(2, first, watchedAgain)))).isEmpty();
    }

    @Test
    void aMiniCutBeginsItsDeficitOnItsFirstDay() {
        LocalDate start = LocalDate.of(2026, 11, 2);
        CallStore.Plan building = new CallStore.Plan(Phase.BULK, CUT_BEGAN, CUT_BEGAN, 3000, false, null);
        CallStore.Plan mini = new CallStore.Plan(Phase.CUT, start, start, 2400, false, null, start.plusWeeks(6));
        assertThat(DeficitStart.of(mini, List.of(step(1, building, mini)))).contains(start);
    }

    @Test
    void anEarlierCutsDeficitIsNotThisOnes() {
        LocalDate newCut = LocalDate.of(2026, 12, 1);
        CallStore.Plan before = under(LocalDate.of(2026, 9, 15), 2300);
        CallStore.Plan current = new CallStore.Plan(Phase.CUT, newCut, newCut, 2200, false, null);
        // No call took this cut from watched to a deficit (a plan written another way): nothing to say when — nothing said.
        assertThat(DeficitStart.of(current, List.of(step(1, WATCHED, before)))).isEmpty();
    }

    @Test
    void buildingHasNoDeficitWhateverCameBefore() {
        CallStore.Plan first = under(LocalDate.of(2026, 9, 15), 2300);
        CallStore.Plan building = new CallStore.Plan(Phase.BULK, CUT_BEGAN, CUT_BEGAN, 3000, false, null);
        assertThat(DeficitStart.of(building, List.of(step(1, WATCHED, first), step(2, first, building)))).isEmpty();
    }

    private static CallStore.Plan under(LocalDate planStart, int kcal) {
        return new CallStore.Plan(Phase.CUT, CUT_BEGAN, planStart, kcal, false, null);
    }

    private static CallStore.PlanStep step(int order, CallStore.Plan before, CallStore.Plan after) {
        return new CallStore.PlanStep(Instant.parse("2026-09-01T00:00:00Z").plusSeconds(86_400L * order), before, after);
    }
}
