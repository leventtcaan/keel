package app.keel.engine;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.HexFormat;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * The engine's whole, checked parameter set (K2, U14, ADR-010) and its version hash.
 *
 * <p>The engine does no I/O (ADR-003): the caller reads data/parameters/{@link ParameterDomain#fileName()} files,
 * parses the YAML and passes the documents to {@link #fromDocuments}. A set exists only if every check passed, so
 * a rule never meets a missing, unsourced, mistyped or out-of-range parameter at decision time.
 *
 * <p>Caller contract: parse with duplicate keys disallowed (SnakeYAML {@code LoaderOptions.setAllowDuplicateKeys(false)}),
 * otherwise a repeated {@code value:} silently keeps the last one before the engine can see it.
 */
public final class ParameterSet {

    private final Map<ParameterKey, Parameter> parameters;
    private final String versionHash;

    private ParameterSet(Map<ParameterKey, Parameter> parameters) {
        // The reader guarantees this; checked again so a future change cannot hand rules a partial set.
        if (!parameters.keySet().equals(EnumSet.allOf(ParameterKey.class))) {
            throw new IllegalStateException("Parameter set is incomplete: " + parameters.keySet());
        }
        this.parameters = Map.copyOf(parameters);
        this.versionHash = hashOf(parameters);
    }

    /**
     * Checks and loads the parsed parameter files.
     *
     * @param documentsByFileName parsed YAML per file name, e.g. {@code "windows.yaml" → {parameters: [...]}}
     * @throws InvalidParametersException listing every problem found, not just the first
     */
    public static ParameterSet fromDocuments(Map<String, ?> documentsByFileName) {
        return new ParameterSet(ParameterDocuments.read(documentsByFileName));
    }

    public Map<ParameterKey, Parameter> parameters() {
        return parameters;
    }

    /**
     * SHA-256 over what can change a decision — key, unit and values — in key order. Notes, sources and file layout
     * are left out, so rewording a note is not a new rule set. Stored with each decision (K-2xx) to make it
     * reproducible (ADR-003 §6).
     */
    public String versionHash() {
        return versionHash;
    }

    public Parameters forSex(Sex sex) {
        Objects.requireNonNull(sex, "sex");
        Map<ParameterKey, ParameterValue> values = new EnumMap<>(ParameterKey.class);
        parameters.forEach((key, parameter) -> values.put(key, parameter.valueFor(sex)));
        return new Parameters(sex, values);
    }

    // Package-private so the format can be pinned by a test (stored hashes must stay comparable).
    static String hashOf(Map<ParameterKey, Parameter> parameters) {
        String canonical = parameters.values().stream()
                .sorted(Comparator.comparing(parameter -> parameter.key().yamlKey()))
                .map(parameter -> String.join("|", parameter.key().yamlKey(), parameter.key().unit().yamlName(),
                        parameter.male().canonical(), parameter.female().canonical()))
                .collect(Collectors.joining("\n"));
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(canonical.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Every Java runtime must provide SHA-256", e);
        }
    }
}
