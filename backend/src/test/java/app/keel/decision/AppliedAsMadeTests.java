package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

/**
 * Applied by default (ADR-077 #3, K-1000): a call just made is applied through the one apply path; when that cannot move
 * the plan now (CONFLICT: another call moved it meanwhile, a program call without a program) the call stays PENDING as
 * made and the app offers "Use this call". A program call without a program cannot come out of a check-in (the ladder
 * reads the program's own sessions), so this is held at the decision itself, not through a made-up check-in.
 */
class AppliedAsMadeTests {

    @Test
    void anApplyThatMovedThePlanIsApplied() {
        AtomicInteger runs = new AtomicInteger();

        assertThat(DecisionService.appliedAsMade(runs::incrementAndGet)).isTrue();
        assertThat(runs).hasValue(1);
    }

    @Test
    void anApplyThatCannotMoveThePlanNowLeavesTheCallPendingAndSaysSo() {
        assertThat(DecisionService.appliedAsMade(() -> {
            throw new ApiException(ErrorCode.CONFLICT);
        })).isFalse();
    }

    @Test
    void anythingElseIsNotSwallowed() {
        for (ErrorCode code : new ErrorCode[] {ErrorCode.NOT_FOUND, ErrorCode.CONSENT_REQUIRED}) {
            assertThatThrownBy(() -> DecisionService.appliedAsMade(() -> {
                throw new ApiException(code);
            })).isInstanceOf(ApiException.class).extracting(thrown -> ((ApiException) thrown).code()).isEqualTo(code);
        }
    }
}
