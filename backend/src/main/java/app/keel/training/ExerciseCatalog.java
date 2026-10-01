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

    /**
     * What the load is made of (ADR-032), and so what {@code loadKg} means: a bar with pairs of plates (the total), one
     * dumbbell (its own weight), a machine's or a cable's stack (the reading), plates on a sled (the plates, not the sled),
     * or the body (the added load — one plate or one dumbbell).
     */
    public enum Equipment { BARBELL, DUMBBELL, MACHINE, CABLE, PLATE_LOADED, BODYWEIGHT }

    /** The two demonstration clips, paths inside the app's assets (ADR-017). */
    public record Clips(String firstRep, String lastRep) {
    }

    /**
     * A move. {@code setup}: what the user sets on the machine, kept on the phone (ADR-017 setup card). {@code clips}:
     * its two demonstrations; {@code reviewed}: they passed docs/hareket-cekim-kontrol-listesi.md — until then the app
     * is not given them.
     */
    public record Exercise(String id, Kind kind, List<String> muscles, List<String> alternatives, Load load, Equipment equipment,
            boolean unilateral, List<String> setup, Clips clips, boolean reviewed) {

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
    private static final Set<String> FIELDS = Set.of("id", "kind", "muscles", "alternatives", "load", "equipment", "unilateral", "setup", "clips", "review");

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
        Set<Object> setupFields = Set.copyOf((List<Object>) vocabulary.getOrDefault("setup_fields", List.of()));
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
            // Required, possibly empty: a missing list and a misspelt key would otherwise both read as "no setup".
            require(move.get("setup") instanceof List, file + ": setup is a list (empty when there is nothing to set)");
            List<String> setup = (List<String>) move.get("setup");
            require(Set.copyOf(setup).size() == setup.size(), file + ": a setup field is named once");
            for (String field : setup) {
                require(setupFields.contains(field), file + ": " + field + " is not a setup field in data/exercise-setup.yaml");
            }
            Clips clips = clips(file, id, move.get("clips"));
            boolean reviewed = reviewed(file, move.get("review"));
            require(!alternatives.contains(id), file + ": a move is not its own alternative");
            require(move.get("unilateral") instanceof Boolean, file + ": unilateral is true or false");
            Load load = value(Load.class, move.get("load"), file);
            Equipment equipment = value(Equipment.class, move.get("equipment"), file);
            // The body carries a bodyweight move's load; any other move's load is all on the equipment.
            require((equipment == Equipment.BODYWEIGHT) == (load != Load.EXTERNAL), file + ": equipment bodyweight goes with a bodyweight load");
            moves.add(new Exercise(id, value(Kind.class, move.get("kind"), file), muscles.stream().map(String.class::cast).toList(),
                    List.copyOf(alternatives),
                    load, equipment, (Boolean) move.get("unilateral"), List.copyOf(setup), clips, reviewed));
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

    // The app's asset paths (ADR-017): a move's own folder, one file per clip.
    private static final String FIRST_REP = "clips/%s/first-rep.mp4";
    private static final String LAST_REP = "clips/%s/last-rep.mp4";
    private static final Set<String> REVIEW_FIELDS = Set.of("date", "by", "checklist", "notes");

    @SuppressWarnings("unchecked")
    private static Clips clips(String file, String id, Object raw) {
        require(raw instanceof Map, file + ": clips (first_rep, last_rep) are missing");
        Map<String, Object> clips = (Map<String, Object>) raw;
        require(clips.keySet().equals(Set.of("first_rep", "last_rep")), file + ": clips are first_rep and last_rep");
        require(String.format(FIRST_REP, id).equals(clips.get("first_rep")), file + ": first_rep is " + String.format(FIRST_REP, id));
        require(String.format(LAST_REP, id).equals(clips.get("last_rep")), file + ": last_rep is " + String.format(LAST_REP, id));
        return new Clips((String) clips.get("first_rep"), (String) clips.get("last_rep"));
    }

    /** "pending" until filmed and checked; then the checklist's record, which must say pass. */
    @SuppressWarnings("unchecked")
    private static boolean reviewed(String file, Object raw) {
        if ("pending".equals(raw)) {
            return false;
        }
        require(raw instanceof Map, file + ": review is pending or {date, by, checklist: pass, notes}");
        Map<String, Object> review = (Map<String, Object>) raw;
        require(REVIEW_FIELDS.containsAll(review.keySet()), file + ": review fields are " + REVIEW_FIELDS);
        require("pass".equals(review.get("checklist")), file + ": a review records a passed checklist");
        require(review.get("by") instanceof String by && !by.isBlank(), file + ": a review says who checked");
        // Quoted text, parsed strictly: SnakeYAML reads an unquoted date leniently (2026-02-30 becomes 2 March).
        require(review.get("date") instanceof String text && isDate(text), file + ": a review has its date, quoted (\"YYYY-MM-DD\")");
        return true;
    }

    private static boolean isDate(String text) {
        try {
            java.time.LocalDate.parse(text);
            return true;
        } catch (java.time.format.DateTimeParseException notADate) {
            return false;
        }
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
