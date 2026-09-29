package app.keel.architecture;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStream;
import java.io.Reader;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.yaml.snakeyaml.Yaml;

/**
 * U14 as ADR-020 sharpened it: a source names the rule, not only the file. Every reference — in the parameter files,
 * in the weekly check-in specification and in engine code — ends in {@code #anchor}, and the anchor is a real rule
 * or section in that file: a Markdown heading ({@code ### K-17 · …}, {@code ## 3.4 …}) or a bold rule label
 * ({@code **U2 · …}) that starts with it.
 */
class SourceAnchorTests {

    private static final Path REPO_ROOT = Path.of("..");
    private static final Path MAIN_CODE = Path.of("src/main/java");
    private static final Path SPEC = Path.of("src/test/resources/spec/weekly-checkin.yaml");

    // A quoted research reference in Java code, e.g. "arastirma/ham/guray/G2-kilo-verme.md#K-17".
    private static final Pattern CODE_REFERENCE = Pattern.compile("\"(arastirma/[^\"\\s]+?\\.md(?:#[^\"\\s]*)?)\"");

    @Test
    void everySourceNamesARuleThatExists() throws IOException {
        List<String> problems = new ArrayList<>();
        for (Reference reference : allReferences()) {
            problem(reference.reference()).ifPresent(problem -> problems.add(reference.where() + ": " + problem));
        }

        assertThat(problems).as("sources without a resolvable #rule anchor").isEmpty();
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "### K-17 · Haftada 1 kg tavan — aşılmaz | K-17 | true",
            "## 3.4 Kilo trendi matematiği | 3.4 | true",
            "**U2 · Kararı ısrar değil veri değiştirir.** | U2 | true",
            "## D21b · Kâr eşiği hesabı | D21 | false",
            "### K-170 · Başka kural | K-17 | false",
            "Metinde geçen K-17 bir başlık değil | K-17 | false",
            "- K-17 liste maddesi | K-17 | false"})
    void anchorsResolveOnlyToAHeadingOrRuleLabelThatStartsWithThem(String line, String anchor, boolean resolves) {
        assertThat(isAnchorLine(line, anchor)).isEqualTo(resolves);
    }

    private record Reference(String where, String reference) {
    }

    private static Optional<String> problem(String reference) {
        String[] parts = reference.split("#", 2);
        Path file = REPO_ROOT.resolve(parts[0]);
        if (!Files.isRegularFile(file)) {
            return Optional.of("file does not exist: " + parts[0]);
        }
        if (parts.length < 2 || parts[1].isBlank()) {
            return Optional.of("no #rule anchor in '" + reference + "'");
        }
        try (Stream<String> lines = Files.lines(file)) {
            return lines.anyMatch(line -> isAnchorLine(line, parts[1]))
                    ? Optional.empty()
                    : Optional.of("anchor #" + parts[1] + " is not a heading or rule label in " + parts[0]);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    // Heading marks or bold, then the anchor, then a separator: "K-17" must not match "K-170" or "D21b".
    static boolean isAnchorLine(String line, String anchor) {
        return Pattern.compile("^(#{1,6}\\s+|\\*\\*)" + Pattern.quote(anchor) + "(\\s|·|:|\\*|$)").matcher(line).find();
    }

    private static List<Reference> allReferences() throws IOException {
        List<Reference> references = new ArrayList<>();
        references.addAll(parameterReferences());
        references.addAll(specReferences());
        references.addAll(codeReferences());
        assertThat(references).as("found references to check").hasSizeGreaterThan(50);
        return references;
    }

    @SuppressWarnings("unchecked")
    private static List<Reference> parameterReferences() throws IOException {
        List<Reference> references = new ArrayList<>();
        try (Stream<Path> files = Files.list(REPO_ROOT.resolve("data/parameters"))) {
            for (Path file : files.filter(p -> p.toString().endsWith(".yaml")).sorted().toList()) {
                try (Reader reader = Files.newBufferedReader(file)) {
                    Map<String, Object> document = new Yaml().load(reader);
                    for (Map<String, Object> parameter : (List<Map<String, Object>>) document.get("parameters")) {
                        references.add(new Reference(file.getFileName() + " → " + parameter.get("key"),
                                String.valueOf(parameter.get("source"))));
                    }
                }
            }
        }
        return references;
    }

    @SuppressWarnings("unchecked")
    private static List<Reference> specReferences() throws IOException {
        try (InputStream in = Files.newInputStream(SPEC)) {
            Map<String, Object> spec = new Yaml().load(in);
            return ((List<Map<String, Object>>) spec.get("rows")).stream()
                    .map(row -> new Reference("spec " + row.get("id"), String.valueOf(row.get("source"))))
                    .toList();
        }
    }

    private static List<Reference> codeReferences() throws IOException {
        List<Reference> references = new ArrayList<>();
        try (Stream<Path> files = Files.walk(MAIN_CODE)) {
            for (Path file : files.filter(p -> p.toString().endsWith(".java")).sorted().toList()) {
                Matcher matcher = CODE_REFERENCE.matcher(Files.readString(file));
                while (matcher.find()) {
                    references.add(new Reference(file.getFileName().toString(), matcher.group(1)));
                }
            }
        }
        return references;
    }
}
