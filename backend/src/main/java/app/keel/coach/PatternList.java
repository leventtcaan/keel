package app.keel.coach;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import tools.jackson.databind.json.JsonMapper;

/**
 * Patterns read from a data file (K-2: words are data), each with the examples it must catch and the near-misses it must
 * let through — checked by the tests in Java, as the app checks them in JavaScript.
 */
final class PatternList {

    /** {@code ignoring}, if any: what is taken out of a text before it is matched (a research path, for a name). */
    record Entry(String id, Pattern pattern, Pattern ignoring, List<String> examples, List<String> nonExamples) {

        boolean matches(String text) {
            return pattern.matcher(ignoring == null ? text : ignoring.matcher(text).replaceAll("")).find();
        }
    }

    private final List<Entry> entries;

    PatternList(List<Entry> entries) {
        this.entries = List.copyOf(entries);
    }

    @SuppressWarnings("unchecked")
    static Map<String, Object> json(String resource) {
        try (InputStream in = PatternList.class.getClassLoader().getResourceAsStream(resource)) {
            if (in == null) {
                throw new IllegalStateException(resource + " is not on the classpath");
            }
            return JsonMapper.builder().build().readValue(in, Map.class);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @SuppressWarnings("unchecked")
    static Entry entry(Map<String, Object> raw, String id, int flags) {
        return entry(raw, id, flags, null);
    }

    @SuppressWarnings("unchecked")
    static Entry entry(Map<String, Object> raw, String id, int flags, Pattern ignoring) {
        return new Entry(id, Pattern.compile((String) raw.get("pattern"), flags), ignoring, (List<String>) raw.getOrDefault("examples", List.of()),
                (List<String>) raw.getOrDefault("nonExamples", List.of()));
    }

    /** The ids of the entries the text matches. */
    List<String> found(String text) {
        return entries.stream().filter(entry -> entry.matches(text)).map(Entry::id).toList();
    }

    /** Every entry against its own examples and near-misses: what does not hold. */
    List<String> selfCheck() {
        List<String> problems = new ArrayList<>();
        for (Entry entry : entries) {
            entry.examples().stream().filter(example -> !entry.matches(example))
                    .forEach(example -> problems.add(entry.id() + " misses \"" + example + "\""));
            entry.nonExamples().stream().filter(entry::matches)
                    .forEach(text -> problems.add(entry.id() + " catches \"" + text + "\""));
        }
        return problems;
    }

    int size() {
        return entries.size();
    }
}
