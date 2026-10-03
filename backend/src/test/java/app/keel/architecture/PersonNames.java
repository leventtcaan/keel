package app.keel.architecture;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import tools.jackson.databind.json.JsonMapper;

/**
 * The person names no product face may carry (K-523, ADR-041 #72), as data/copy/forbidden-phrases.json › personNames
 * lists them — the same list the app's copy scan reads. A research path (arastirma/…) is taken out first: it is
 * internal, read on the server, and may hold a name.
 */
final class PersonNames {

    private static final Path LIST = Path.of("../data/copy/forbidden-phrases.json");

    private PersonNames() {
    }

    /** The names found in {@code text}, research paths aside. */
    static List<String> in(String text) {
        Map<String, Object> names = section();
        String withoutPaths = Pattern.compile((String) names.get("researchPath")).matcher(text).replaceAll("");
        Matcher found = pattern().matcher(withoutPaths);
        return found.results().map(java.util.regex.MatchResult::group).toList();
    }

    static Pattern pattern() {
        return Pattern.compile((String) section().get("pattern"), Pattern.CASE_INSENSITIVE);
    }

    @SuppressWarnings("unchecked")
    static Map<String, Object> section() {
        try {
            return (Map<String, Object>) JsonMapper.builder().build().readValue(Files.readString(LIST), Map.class).get("personNames");
        } catch (IOException e) {
            throw new IllegalStateException("Cannot read " + LIST, e);
        }
    }
}
