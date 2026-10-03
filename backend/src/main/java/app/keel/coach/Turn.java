package app.keel.coach;

import java.util.Objects;

/** One turn of a conversation with the model: the user's words or the model's; the user's may carry a picture (K-514). */
record Turn(Role role, String text, Picture picture) {

    enum Role { USER, ASSISTANT }

    Turn {
        Objects.requireNonNull(role, "role");
        Objects.requireNonNull(text, "text");
        if (picture != null && role != Role.USER) {
            throw new IllegalArgumentException("only the user's turn carries a picture");
        }
    }

    static Turn user(String text) {
        return new Turn(Role.USER, text, null);
    }

    /** The user's turn with a picture (K-514): a meal photo the server cleaned. */
    static Turn userWithPicture(String text, Picture picture) {
        return new Turn(Role.USER, text, Objects.requireNonNull(picture, "picture"));
    }

    static Turn assistant(String text) {
        return new Turn(Role.ASSISTANT, text, null);
    }
}
