package app.keel.engine;

import java.util.Optional;

/** The mini cut (G7 K-102). */
public final class MiniCutGate {

    private MiniCutGate() {
    }

    public static Optional<Decision> check(Snapshot snapshot, Parameters parameters) {
        return Optional.empty();
    }
}
