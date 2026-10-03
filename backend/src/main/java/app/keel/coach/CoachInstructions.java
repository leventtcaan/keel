package app.keel.coach;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;

/** The coach's instructions to the model, words kept as data (data/coach/*.md; K2), read once from the classpath. */
final class CoachInstructions {

    private CoachInstructions() {
    }

    static String read(String name) {
        String resource = "data/coach/" + name;
        try (InputStream in = CoachInstructions.class.getClassLoader().getResourceAsStream(resource)) {
            if (in == null) {
                throw new IllegalStateException(resource + " is not on the classpath");
            }
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
