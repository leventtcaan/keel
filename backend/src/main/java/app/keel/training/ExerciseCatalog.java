package app.keel.training;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The exercise catalog (K-210, K2): data/exercises/<id>.yaml, one move per file — compound or isolation (G6 K-35:
 * compound moves are kept, isolation moves may change), the muscles it trains, the moves that can take its place, how it
 * is loaded (a bar, bodyweight, bodyweight plus added load) and whether one side at a time. Checked as it loads: a
 * broken catalog stops the application instead of serving a move that points nowhere.
 */
public final class ExerciseCatalog {

    public enum Kind { COMPOUND, ISOLATION }

    public enum Load { EXTERNAL, BODYWEIGHT, BODYWEIGHT_PLUS_EXTERNAL }

    public record Exercise(String id, Kind kind, List<String> muscles, List<String> alternatives, Load load, boolean unilateral) {

        /** The name's key in data/copy/en.json. */
        public String nameKey() {
            return "exercises." + id + ".name";
        }
    }

    private final Map<String, Exercise> byId;

    private ExerciseCatalog(Map<String, Exercise> byId) {
        this.byId = byId;
    }

    /** The catalog from its files (file name → parsed YAML); IllegalArgumentException naming the first problem. */
    @SuppressWarnings("unchecked")
    static ExerciseCatalog of(Map<String, Object> filesByName) {
        List<Exercise> moves = new ArrayList<>();
        filesByName.forEach((file, document) -> {
            Map<String, Object> move = (Map<String, Object>) document;
            String id = (String) move.get("id");
            require(id != null && file.equals(id + ".yaml"), file + ": the file is named for its id");
            List<String> muscles = (List<String>) move.getOrDefault("muscles", List.of());
            require(muscles != null && !muscles.isEmpty(), file + ": at least one muscle");
            List<String> alternatives = move.get("alternatives") == null ? List.of() : (List<String>) move.get("alternatives");
            require(!alternatives.contains(id), file + ": a move is not its own alternative");
            require(move.get("unilateral") instanceof Boolean, file + ": unilateral is true or false");
            moves.add(new Exercise(id, value(Kind.class, move.get("kind"), file), List.copyOf(muscles), List.copyOf(alternatives),
                    value(Load.class, move.get("load"), file), (Boolean) move.get("unilateral")));
        });
        Map<String, Exercise> byId = moves.stream().sorted(Comparator.comparing(Exercise::id))
                .collect(Collectors.toMap(Exercise::id, Function.identity(), (a, b) -> a, java.util.LinkedHashMap::new));
        for (Exercise move : moves) {
            for (String alternative : move.alternatives()) {
                require(byId.containsKey(alternative), move.id() + ": alternative " + alternative + " is not in the catalog");
            }
        }
        return new ExerciseCatalog(byId);
    }

    public List<Exercise> all() {
        return List.copyOf(byId.values());
    }

    public Optional<Exercise> find(String id) {
        return Optional.ofNullable(id).map(byId::get);
    }

    private static <E extends Enum<E>> E value(Class<E> type, Object raw, String file) {
        require(raw instanceof String, file + ": " + type.getSimpleName().toLowerCase(Locale.ROOT) + " is missing");
        try {
            return Enum.valueOf(type, ((String) raw).toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException unknown) {
            throw new IllegalArgumentException(file + ": unknown " + type.getSimpleName().toLowerCase(Locale.ROOT) + " " + raw, unknown);
        }
    }

    private static void require(boolean ok, String problem) {
        if (!ok) {
            throw new IllegalArgumentException("Exercise catalog: " + problem);
        }
    }
}
