package app.keel.engine;

import java.util.List;

/** The parameter files are not usable; {@link #problems()} lists every reason, one line each (file → key: what). */
public final class InvalidParametersException extends RuntimeException {

    private final List<String> problems;

    public InvalidParametersException(List<String> problems) {
        super(String.join("\n", requireSome(problems)));
        this.problems = List.copyOf(problems);
    }

    private static List<String> requireSome(List<String> problems) {
        if (problems.isEmpty()) {
            throw new IllegalArgumentException("An invalid parameter set names at least one problem");
        }
        return problems;
    }

    public List<String> problems() {
        return problems;
    }
}
