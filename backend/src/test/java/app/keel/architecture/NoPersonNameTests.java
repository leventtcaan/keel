package app.keel.architecture;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

/**
 * The product's code names no person (K-523, ADR-041 #72): not in a constant (GURAY_LOSS_CAP), not in a comment. A
 * rule says what kind of source it rests on — coaching experience, the literature, a product decision — and its research
 * path, kept on the server for audit, is the only place a name may stand (data/copy/forbidden-phrases.json ›
 * personNames). The app's own code and copy are scanned by forbidden-phrases.test.ts.
 */
class NoPersonNameTests {

    @Test
    void theListProvesItselfOnItsExamples() {
        @SuppressWarnings("unchecked")
        List<String> examples = (List<String>) PersonNames.section().get("examples");
        @SuppressWarnings("unchecked")
        List<String> nonExamples = (List<String>) PersonNames.section().get("nonExamples");

        assertThat(examples).isNotEmpty().allSatisfy(example -> assertThat(PersonNames.in(example)).as(example).isNotEmpty());
        assertThat(nonExamples).isNotEmpty().allSatisfy(text -> assertThat(PersonNames.in(text)).as(text).isEmpty());
    }

    @Test
    void noFileOfTheBackendsCodeNamesAPerson() throws IOException {
        List<Path> files;
        try (Stream<Path> walk = Files.walk(Path.of("src/main"))) {
            files = walk.filter(Files::isRegularFile).toList();
        }
        assertThat(files).hasSizeGreaterThan(100);

        List<String> offenders = files.stream().flatMap(file -> {
            try {
                List<String> lines = Files.readAllLines(file);
                return java.util.stream.IntStream.range(0, lines.size())
                        .filter(i -> !PersonNames.in(lines.get(i)).isEmpty())
                        .mapToObj(i -> file + ":" + (i + 1) + " " + PersonNames.in(lines.get(i)));
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
        }).toList();
        assertThat(offenders).isEmpty();
    }
}
