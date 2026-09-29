package app.keel.engine;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HexFormat;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * The engine's whole, checked parameter set (K2, U14, ADR-010) and its version hash.
 *
 * <p>The engine does no I/O (ADR-003): the caller reads data/parameters/{@link ParameterDomain#fileName()} files,
 * parses the YAML and passes the documents to {@link #fromDocuments}. A set exists only if every check passed, so
 * a rule never meets a missing, unsourced or mistyped parameter at decision time.
 */
public final class ParameterSet {

    private final Map<ParameterKey, Parameter> parameters;
    private final String versionHash;

    private ParameterSet(Map<ParameterKey, Parameter> parameters) {
        this.parameters = Map.copyOf(parameters);
        this.versionHash = hash(parameters);
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

    private static String hash(Map<ParameterKey, Parameter> parameters) {
        String canonical = parameters.values().stream()
                .sorted(Comparator.comparing(parameter -> parameter.key().yamlKey()))
                .map(parameter -> String.join("|", parameter.key().yamlKey(), parameter.key().unit(),
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
