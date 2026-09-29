package app.keel.engine;

import java.util.List;

public final class InvalidParametersException extends RuntimeException {

    private final List<String> problems;

    public InvalidParametersException(List<String> problems) {
        super(String.join("\n", problems));
        this.problems = List.copyOf(problems);
    }

    public List<String> problems() {
        return problems;
    }
}
