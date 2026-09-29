package app.keel.training;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
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

    public enum Region { UPPER, LOWER }

    public record Exercise(String id, Kind kind, List<String> muscles, List<String> alternatives, Load load, boolean unilateral) {

        /** The name's key in data/copy/en.json. */
        public String nameKey() {
            return "exercises." + id + ".name";
        }
    }

    private final Map<String, Exercise> byId;
    private final Map<String, Region> regions;

    private ExerciseCatalog(Map<String, Exercise> byId, Map<String, Region> regions) {
        this.byId = byId;
        this.regions = regions;
    }

    /** The catalog from its files (file name → parsed YAML); IllegalArgumentException naming the first problem. */
    // Every field a move file may have; anything else is a typo that would silently drop data (K-210 review).
    private static final Set<String> FIELDS = Set.of("id", "kind", "muscles", "alternatives", "load", "unilateral");

    /** The region a muscle belongs to (data/muscles.yaml); the load step depends on it (K-217). */
    public Region region(String muscle) {
        Region region = regions.get(muscle);
        if (region == null) {
            throw new IllegalArgumentException("Not a muscle in data/muscles.yaml: " + muscle);
        }
        return region;
    }

    /**
     * The catalog from its files (file name → parsed YAML) and the muscle vocabulary (data/muscles.yaml);
     * IllegalArgumentException naming the first problem.
     */
    @SuppressWarnings("unchecked")
    static ExerciseCatalog of(Map<String, Object> filesByName, Map<String, Object> vocabulary) {
        Map<String, Region> regions = new java.util.HashMap<>();
        ((Map<String, Object>) vocabulary.get("muscles")).forEach((muscle, region) -> regions.put(muscle, value(Region.class, region, "muscles.yaml")));
        List<Exercise> moves = new ArrayList<>();
        filesByName.forEach((file, document) -> {
            Map<String, Object> move = (Map<String, Object>) document;
            Set<String> unknown = new java.util.TreeSet<>(move.keySet());
            unknown.removeAll(FIELDS);
            require(unknown.isEmpty(), file + ": unknown fields " + unknown);
            String id = (String) move.get("id");
            require(id != null && file.equals(id + ".yaml"), file + ": the file is named for its id");
            List<Object> muscles = (List<Object>) move.getOrDefault("muscles", List.of());
            require(muscles != null && !muscles.isEmpty(), file + ": at least one muscle");
            for (Object muscle : muscles) {
                require(regions.containsKey(muscle), file + ": " + muscle + " is not a muscle in data/muscles.yaml");
            }
            List<String> alternatives = move.get("alternatives") == null ? List.of() : (List<String>) move.get("alternatives");
            require(!alternatives.contains(id), file + ": a move is not its own alternative");
            require(move.get("unilateral") instanceof Boolean, file + ": unilateral is true or false");
            moves.add(new Exercise(id, value(Kind.class, move.get("kind"), file), muscles.stream().map(String.class::cast).toList(),
                    List.copyOf(alternatives),
                    value(Load.class, move.get("load"), file), (Boolean) move.get("unilateral")));
        });
        Map<String, Exercise> byId = moves.stream().sorted(Comparator.comparing(Exercise::id))
                .collect(Collectors.toMap(Exercise::id, Function.identity(), (a, b) -> a, java.util.LinkedHashMap::new));
        for (Exercise move : moves) {
            for (String alternative : move.alternatives()) {
                require(byId.containsKey(alternative), move.id() + ": alternative " + alternative + " is not in the catalog");
            }
        }
        return new ExerciseCatalog(byId, Map.copyOf(regions));
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
