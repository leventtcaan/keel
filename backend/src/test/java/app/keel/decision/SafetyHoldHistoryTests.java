package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * Whether a hard stop holds (K-229): from the calls themselves, oldest first — an applied hard stop starts it, the next
 * applied call that opens a deficit ends it. Calls not applied, or undone, change nothing. No separate flag is kept.
 */
class SafetyHoldHistoryTests {

    private static final Map<String, Object> HARD_STOP = Map.of("action", Map.of("type", "CHANGE_PHASE", "to", "BULK"), "safety", true);
    private static final Map<String, Object> CUT = Map.of("action", Map.of("type", "CHANGE_PHASE", "to", "CUT"));
    private static final Map<String, Object> STEP_DOWN = Map.of("action", Map.of("type", "ADJUST_CALORIES", "kcalPerDay", -150));
    private static final Map<String, Object> MORE = Map.of("action", Map.of("type", "ADJUST_CALORIES", "kcalPerDay", 150));
    private static final Map<String, Object> CONTINUE = Map.of("action", Map.of("type", "CONTINUE"));

    private static int day;

    private static CallStore.Call call(Map<String, Object> decision, CallStore.Application application) {
        day++;
        return new CallStore.Call(UUID.randomUUID(), UUID.randomUUID(), LocalDate.of(2026, 1, 1).plusWeeks(day), LocalDate.of(2026, 1, 1).plusWeeks(day),
                Instant.parse("2026-01-01T08:00:00Z").plusSeconds(day * 604_800L), "h", null, decision, application);
    }

    private static CallStore.Call applied(Map<String, Object> decision) {
        return call(decision, CallStore.Application.APPLIED);
    }

    @Test
    void noHardStopNoHold() {
        assertThat(SafetyHolds.from(List.of(applied(CUT), applied(MORE)))).isFalse();
    }

    @Test
    void anAppliedHardStopHoldsThroughCallsThatOpenNoDeficit() {
        assertThat(SafetyHolds.from(List.of(applied(HARD_STOP)))).isTrue();
        assertThat(SafetyHolds.from(List.of(applied(HARD_STOP), applied(MORE), call(CONTINUE, CallStore.Application.NOT_NEEDED)))).isTrue();
    }

    @Test
    void theNextAppliedCallThatOpensADeficitEndsIt() {
        assertThat(SafetyHolds.from(List.of(applied(HARD_STOP), applied(CUT)))).isFalse();
        assertThat(SafetyHolds.from(List.of(applied(HARD_STOP), applied(STEP_DOWN)))).isFalse();
    }

    @Test
    void aCallNotAppliedOrUndoneChangesNothing() {
        assertThat(SafetyHolds.from(List.of(applied(HARD_STOP), call(CUT, CallStore.Application.PENDING)))).isTrue();
        assertThat(SafetyHolds.from(List.of(applied(HARD_STOP), call(CUT, CallStore.Application.UNDONE)))).isTrue();
        assertThat(SafetyHolds.from(List.of(call(HARD_STOP, CallStore.Application.PENDING)))).isFalse();
    }

    @Test
    void theOrderIsTheCallsOwnNotTheListsAndASecondHardStopHoldsAgain() {
        CallStore.Call first = applied(HARD_STOP);
        CallStore.Call cut = applied(CUT);
        CallStore.Call again = applied(HARD_STOP);
        // The store lists the newest first.
        assertThat(SafetyHolds.from(List.of(again, cut, first))).isTrue();
        assertThat(SafetyHolds.from(List.of(cut, first))).isFalse();
    }
}
