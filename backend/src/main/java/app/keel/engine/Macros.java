package app.keel.engine;

import java.util.List;
import java.util.Objects;

/**
 * Daily macro targets in whole grams. {@code notes} explain anything the user should know about the split
 * (today: a carb squeeze at low calories); empty when the split is the plain one.
 */
public record Macros(int proteinG, int fatG, int carbsG, int fiberG, List<Reason> notes) {

    public Macros {
        Objects.requireNonNull(notes, "notes");
        notes = List.copyOf(notes);
    }
}
