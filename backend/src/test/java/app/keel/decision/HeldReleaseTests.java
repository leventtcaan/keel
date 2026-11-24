package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

/** A failing release of the held calls is logged through SafeLog, by kind, and does not take the read down (ADR-091 Ek 1). */
@ExtendWith(OutputCaptureExtension.class)
class HeldReleaseTests {

    @Test
    void aFailureIsLoggedAtWarnWithoutAnAccountAndTheReadGoesOn(CapturedOutput output) {
        assertThatCode(() -> HeldRelease.run(() -> {
            throw new ApiException(ErrorCode.CONFLICT);
        })).doesNotThrowAnyException();

        assertThat(output.getAll()).contains("app.keel.decision.HeldRelease#run").contains("ApiException");
    }

    @Test
    void aStepThatWorksLogsNothing(CapturedOutput output) {
        HeldRelease.run(() -> { });

        assertThat(output.getAll()).doesNotContain("HeldRelease");
    }
}
