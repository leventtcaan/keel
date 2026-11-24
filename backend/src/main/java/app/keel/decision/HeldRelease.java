package app.keel.decision;

import app.keel.shared.SafeLog;
import java.lang.reflect.Method;

/**
 * The step that opens the calls held back once an account has the subscription (DecisionService.releaseHeld) must not take the read
 * routes down with it: a failure is logged through SafeLog (its kind and where, no account, no data: V3) and the read goes on as it
 * would have without the step. The calls stay held and the next read tries again.
 */
final class HeldRelease {

    private HeldRelease() {
    }

    static void run(Runnable release) {
        try {
            release.run();
        } catch (RuntimeException failed) {
            SafeLog.backgroundFailure(step(), failed);
        }
    }

    private static Method step() {
        try {
            return HeldRelease.class.getDeclaredMethod("run", Runnable.class);
        } catch (NoSuchMethodException unreachable) {
            throw new IllegalStateException(unreachable);
        }
    }
}
