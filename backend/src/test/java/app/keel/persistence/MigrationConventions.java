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
 * gaps. The owner is a module, and a module's migration names only tables in its own schema, {@code <module>.<table>},
 * wherever a statement names one — so no module reaches into another's tables, not even with a foreign key. Quoted
 * names are refused (they would hide the schema). The one other owner is {@code modulith}: the event registry, in
 * {@code public}. A quick lint over the files; the database's own catalog is the final check (ModuleBoundary).
 */
final class MigrationConventions {

    // Gradle runs tests with the project directory (backend/) as the working directory.
    static final Path DIRECTORY = Path.of("src/main/resources/db/migration");
    static final String FRAMEWORK = "modulith";

    private static final Pattern NAME = Pattern.compile("V(\\d+)__([a-z]+)_[a-z0-9_]+\\.sql");
    private static final Pattern COMMENT = Pattern.compile("--[^\n]*");
    private static final Pattern STRING = Pattern.compile("'[^']*'");
    private static final String NAME_PART = "([a-z_][a-z0-9_.]*)";
    // Every place a statement names a table or schema: CREATE/ALTER/DROP/COMMENT ON TABLE, INDEX … ON, TRIGGER … ON,
    // VIEW, REFERENCES, INTO, FROM, JOIN, UPDATE (not ON UPDATE), LIKE, PARTITION OF, SCHEMA, COMMENT ON COLUMN.
    private static final List<Pattern> TARGETS = Stream.of(
            "\\btable\\s+(?:if\\s+(?:not\\s+)?exists\\s+)?(?:only\\s+)?",
            "\\bindex\\b[^;]*?\\bon\\s+(?:only\\s+)?",
            "\\btrigger\\b[^;]*?\\bon\\s+",
            "\\bview\\s+(?:if\\s+not\\s+exists\\s+)?",
            "\\breferences\\s+",
            "\\b(?:into|from|join|like)\\s+(?:only\\s+)?",
            "(?<!on\\s)\\bupdate\\s+(?:only\\s+)?",
            "\\bpartition\\s+of\\s+",
            "\\bschema\\s+(?:if\\s+not\\s+exists\\s+)?",
            "\\bcomment\\s+on\\s+column\\s+")
            .map(prefix -> Pattern.compile(prefix + NAME_PART, Pattern.CASE_INSENSITIVE)).toList();

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

    /** The tables and schemas the statements name, in the order they appear. */
    private static List<String> targets(String statements) {
        java.util.TreeMap<Integer, String> found = new java.util.TreeMap<>();
        for (Pattern pattern : TARGETS) {
            Matcher target = pattern.matcher(statements);
            while (target.find()) {
                found.put(target.start(1), target.group(1).toLowerCase(Locale.ROOT));
            }
        }
        return List.copyOf(found.values());
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
            String sql = content.apply(file);
            if (sql.contains("\"")) {
                problems.add(file + ": quoted names are not allowed");
                continue;
            }
            String statements = STRING.matcher(COMMENT.matcher(sql).replaceAll("")).replaceAll("''");
            for (String target : targets(statements)) {
                boolean ok = owner.equals(FRAMEWORK) ? !target.contains(".")
                        : target.equals(owner) || target.startsWith(owner + ".");
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
