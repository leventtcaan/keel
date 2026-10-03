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

    private static final int REMEMBERED = 100;

    private final Deque<String> answers = new ArrayDeque<>();
    private RuntimeException failure;
    private final List<ModelRequest> requests = new ArrayList<>();

    @Override
    public synchronized ModelReply complete(ModelRequest request) {
        // The last few only: a bean that lives as long as the server keeps no growing record of anyone's words.
        if (requests.size() == REMEMBERED) {
            requests.removeFirst();
        }
        requests.add(request);
        if (failure != null) {
            RuntimeException thrown = failure;
            failure = null;
            throw thrown;
        }
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

    /** The next call fails with this, as a provider that is down would. */
    synchronized void fail(RuntimeException next) {
        failure = next;
    }

    /** Nothing told, nothing asked. */
    synchronized void forget() {
        answers.clear();
        requests.clear();
        failure = null;
    }
}
