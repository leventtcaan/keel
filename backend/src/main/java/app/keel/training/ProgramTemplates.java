package app.keel.training;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The program templates (K-211): data/programs/<n>-days.yaml, one per number of training days, each day a list of
 * catalog moves with their sets. Data, not code (K2): the split and the moves are coaching content the product owner
 * approves. Checked as they load, like the catalog: a broken template stops the application.
 */
final class ProgramTemplates {

    record Slot(String exerciseId, int sets) {
    }

    /** A template day; {@code key} names it in data/copy/en.json › programDays. */
    record Day(String key, List<Slot> exercises) {

        String nameKey() {
            return "programDays." + key + ".name";
        }
    }

    private static final Pattern FILE = Pattern.compile("([1-9])-days\\.yaml");
    private static final Set<String> DAY_FIELDS = Set.of("day", "exercises");
    private static final Set<String> SLOT_FIELDS = Set.of("exercise", "sets");

    private final Map<Integer, List<Day>> byDayCount;

    private ProgramTemplates(Map<Integer, List<Day>> byDayCount) {
        this.byDayCount = byDayCount;
    }

    /** The templates from their files (file name → parsed YAML); IllegalArgumentException naming the first problem. */
    static ProgramTemplates of(Map<String, Object> filesByName, ExerciseCatalog catalog) {
        Map<Integer, List<Day>> byDayCount = new HashMap<>();
        filesByName.forEach((file, document) -> {
            try {
                List<Day> days = parse(file, document, catalog);
                byDayCount.put(days.size(), days);
            } catch (ClassCastException | NullPointerException wrongShape) {
                // A list where a map was expected, a number where text was: named as the template's problem.
                throw new IllegalArgumentException("Program templates: " + file + " is not shaped as a template", wrongShape);
            }
        });
        return new ProgramTemplates(Map.copyOf(byDayCount));
    }

    @SuppressWarnings("unchecked")
    private static List<Day> parse(String file, Object document, ExerciseCatalog catalog) {
        Matcher name = FILE.matcher(file);
        require(name.matches(), file + ": a template is named <days>-days.yaml");
        require(document instanceof Map<?, ?> map && map.keySet().equals(Set.of("days")), file + ": a template holds days");
        List<Day> days = new ArrayList<>();
        for (Object rawDay : (List<Object>) ((Map<String, Object>) document).get("days")) {
            Map<String, Object> day = (Map<String, Object>) rawDay;
            require(DAY_FIELDS.equals(day.keySet()), file + ": a day is " + new TreeSet<>(DAY_FIELDS));
            List<Slot> slots = new ArrayList<>();
            for (Object rawSlot : (List<Object>) day.get("exercises")) {
                Map<String, Object> slot = (Map<String, Object>) rawSlot;
                require(SLOT_FIELDS.equals(slot.keySet()), file + ": an exercise is " + new TreeSet<>(SLOT_FIELDS));
                require(slot.get("exercise") instanceof String && catalog.find((String) slot.get("exercise")).isPresent(), file + ": " + slot.get("exercise") + " is not in the catalog");
                require(slot.get("sets") instanceof Integer sets && sets >= 1, file + ": sets are a whole number, at least 1");
                slots.add(new Slot((String) slot.get("exercise"), (Integer) slot.get("sets")));
            }
            require(!slots.isEmpty(), file + ": a day has at least one exercise");
            require(day.get("day") instanceof String, file + ": a day has its key");
            days.add(new Day((String) day.get("day"), List.copyOf(slots)));
        }
        require(days.size() == Integer.parseInt(name.group(1)), file + ": holds " + days.size() + " days");
        require(days.stream().map(Day::key).distinct().count() == days.size(), file + ": each day is named once");
        return List.copyOf(days);
    }

    Optional<List<Day>> forDays(int count) {
        return Optional.ofNullable(byDayCount.get(count));
    }

    private static void require(boolean ok, String problem) {
        if (!ok) {
            throw new IllegalArgumentException("Program templates: " + problem);
        }
    }
}
