package app.keel.engine;

import java.util.Arrays;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Where a rule comes from (U14): a Markdown file under arastirma/, optionally with a section or rule anchor
 * ({@code arastirma/ham/guray/G7-whisper-arsiv.md#K-66}), and whose authority it carries. Whether the file exists
 * is checked by tests that can read the repository, not here: the engine does no I/O.
 */
public record Source(String reference, SourceTag tag) {

    private static final Pattern RESEARCH_REFERENCE = Pattern.compile("arastirma/([^\\s#\\\\]+\\.md)(#[^\\s#]+)?");

    public Source {
        Objects.requireNonNull(reference, "reference");
        Objects.requireNonNull(tag, "tag");
        Matcher matcher = RESEARCH_REFERENCE.matcher(reference);
        if (!matcher.matches() || !isPlainRelativePath(matcher.group(1))) {
            throw new IllegalArgumentException("Source must point to a .md file inside arastirma/: '" + reference + "'");
        }
    }

    // No empty, "." or ".." segments: the reference cannot leave arastirma/ or hide behind an alias.
    private static boolean isPlainRelativePath(String path) {
        return Arrays.stream(path.split("/", -1))
                .noneMatch(segment -> segment.isEmpty() || segment.equals(".") || segment.equals(".."));
    }
}
