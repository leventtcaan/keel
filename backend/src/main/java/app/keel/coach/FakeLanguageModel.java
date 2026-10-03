package app.keel.coach;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

/**
 * The only provider until one is chosen (K-503, ADR-041): no network, no data out. It answers what it was told to, in
 * order, and remembers what it was asked — for tests and the evaluation sets (K-506). Told nothing, it answers an empty
 * object, which no reply schema accepts: the coach then says what the engine wrote (the deterministic mode).
 */
final class FakeLanguageModel implements LanguageModel {

    private final Deque<String> answers = new ArrayDeque<>();
    private final List<ModelRequest> requests = new ArrayList<>();

    @Override
    public synchronized ModelReply complete(ModelRequest request) {
        requests.add(request);
        String text = answers.isEmpty() ? "{}" : answers.removeFirst();
        return new ModelReply(text, 0, 0);
    }

    /** The next answer, after the ones already told. */
    synchronized void answer(String text) {
        answers.addLast(text);
    }

    synchronized List<ModelRequest> requests() {
        return List.copyOf(requests);
    }

    /** Nothing told, nothing asked. */
    synchronized void forget() {
        answers.clear();
        requests.clear();
    }
}
