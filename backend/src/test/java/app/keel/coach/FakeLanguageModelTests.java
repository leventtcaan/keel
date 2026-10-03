package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

/**
 * The fake model (K-503): what it was told, in order; told nothing, an empty object no reply schema accepts — the coach
 * then says what the engine wrote. It remembers what it was asked, the last ones only.
 */
class FakeLanguageModelTests {

    private static ModelRequest asked(String words) {
        return new ModelRequest(Purpose.EXPLAIN, "m", 10, "s", List.of(Turn.user(words)));
    }

    @Test
    void itAnswersWhatItWasToldInOrderThenNothing() {
        FakeLanguageModel fake = new FakeLanguageModel();
        fake.answer("{\"text\":\"one\"}");
        fake.answer("{\"text\":\"two\"}");

        assertThat(fake.complete(asked("a")).text()).isEqualTo("{\"text\":\"one\"}");
        assertThat(fake.complete(asked("b")).text()).isEqualTo("{\"text\":\"two\"}");
        assertThat(fake.complete(asked("c")).text()).isEqualTo("{}");
        assertThat(fake.requests()).extracting(request -> request.turns().getFirst().text()).containsExactly("a", "b", "c");
    }

    @Test
    void forgettingClearsBothAndItRemembersTheLastHundredOnly() {
        FakeLanguageModel fake = new FakeLanguageModel();
        fake.answer("{}");
        IntStream.range(0, 150).forEach(n -> fake.complete(asked(String.valueOf(n))));

        assertThat(fake.requests()).hasSize(100).first().satisfies(first -> assertThat(first.turns().getFirst().text()).isEqualTo("50"));
        fake.forget();
        assertThat(fake.requests()).isEmpty();
        assertThat(fake.complete(asked("x")).text()).isEqualTo("{}");
    }
}
