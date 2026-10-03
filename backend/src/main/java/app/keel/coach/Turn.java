package app.keel.coach;

import java.util.Objects;

/** One turn of a conversation with the model: the user's words or the model's. */
record Turn(Role role, String text) {

    enum Role { USER, ASSISTANT }

    Turn {
        Objects.requireNonNull(role, "role");
        Objects.requireNonNull(text, "text");
    }

    static Turn user(String text) {
        return new Turn(Role.USER, text);
    }

    static Turn assistant(String text) {
        return new Turn(Role.ASSISTANT, text);
    }
}
