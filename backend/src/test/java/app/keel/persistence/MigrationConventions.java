package app.keel.persistence;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * How migrations are written (ADR-005, ADR-023). Files are {@code V<n>__<owner>_<what>.sql}, numbered 1, 2, 3… without
 * gaps. The owner is a module, and a module's migration touches only tables in its own schema — every table it
 * creates, alters, indexes or references is {@code <module>.<table>} — so no module reaches into another's tables,
 * not even with a foreign key. The one other owner is {@code modulith}: the event registry, in {@code public}.
 */
final class MigrationConventions {

    // Gradle runs tests with the project directory (backend/) as the working directory.
    static final Path DIRECTORY = Path.of("src/main/resources/db/migration");
    static final String FRAMEWORK = "modulith";

    private static final Pattern NAME = Pattern.compile("V(\\d+)__([a-z]+)_[a-z0-9_]+\\.sql");
    // The table after CREATE/ALTER/DROP TABLE, CREATE INDEX … ON, and REFERENCES.
    private static final Pattern COMMENT = Pattern.compile("--[^\n]*");
    private static final Pattern TABLE = Pattern.compile(
            "\\b(?:table(?:\\s+if\\s+(?:not\\s+)?exists)?|\\son|references)\\s+([a-z_][a-z0-9_.]*)", Pattern.CASE_INSENSITIVE);

    private MigrationConventions() {
    }

    /** The modules that may own tables: every module package except the pure engine and the shared kernel. */
    static Set<String> owners() throws IOException {
        try (Stream<Path> modules = Files.list(Path.of("src/main/java/app/keel"))) {
            List<String> names = new ArrayList<>(modules.filter(Files::isDirectory).map(dir -> dir.getFileName().toString())
                    .filter(name -> !name.equals("engine") && !name.equals("shared")).toList());
            names.add(FRAMEWORK);
            return Set.copyOf(names);
        }
    }

    /** What is wrong with these migration files; empty when they follow the rules. */
    static List<String> problems(List<String> fileNames, java.util.function.Function<String, String> content, Set<String> owners) {
        List<String> problems = new ArrayList<>();
        List<Integer> versions = new ArrayList<>();
        for (String file : fileNames) {
            Matcher name = NAME.matcher(file);
            if (!name.matches()) {
                problems.add(file + ": not V<n>__<owner>_<what>.sql");
                continue;
            }
            versions.add(Integer.parseInt(name.group(1)));
            String owner = name.group(2);
            if (!owners.contains(owner)) {
                problems.add(file + ": owner '" + owner + "' is not a module");
                continue;
            }
            Matcher table = TABLE.matcher(COMMENT.matcher(content.apply(file)).replaceAll(""));
            while (table.find()) {
                String target = table.group(1).toLowerCase(Locale.ROOT);
                boolean ok = owner.equals(FRAMEWORK) ? !target.contains(".") : target.startsWith(owner + ".");
                if (!ok) {
                    problems.add(file + ": touches " + target + ", outside " + (owner.equals(FRAMEWORK) ? "public" : owner + "."));
                }
            }
        }
        List<Integer> sorted = versions.stream().sorted().toList();
        for (int i = 0; i < sorted.size(); i++) {
            if (sorted.get(i) != i + 1) {
                problems.add("versions must run 1, 2, 3… without gaps or repeats, got " + sorted);
                break;
            }
        }
        return problems;
    }
}
