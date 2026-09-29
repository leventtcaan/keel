package app.keel.engine;

import java.util.Objects;
import java.util.regex.Pattern;

/**
 * Where a rule comes from (U14): a file under arastirma/, optionally with a section or rule anchor
 * ({@code arastirma/ham/guray/G7-whisper-arsiv.md#K-66}), and whose authority it carries.
 */
public record Source(String reference, SourceTag tag) {

    // A relative path inside arastirma/ with at least one character after the folder, no spaces, no "..".
    private static final Pattern RESEARCH_REFERENCE = Pattern.compile("arastirma/(?!.*\\.\\./)[^\\s#]+(#\\S+)?");

    public Source {
        Objects.requireNonNull(reference, "reference");
        Objects.requireNonNull(tag, "tag");
        if (!RESEARCH_REFERENCE.matcher(reference).matches()) {
            throw new IllegalArgumentException("Source must point into arastirma/: '" + reference + "'");
        }
    }
}
