package app.keel.decision;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;

/**
 * What the calling phone says it can show (ADR-091 Ek 1, K-1201): a comma separated list in one request header, both names in
 * data/parameters/quota.yaml (K2). A phone that does not say it (the 1.0 in the stores) is served exactly as before the locked
 * call existed: its call is never held back and never answered with the locked view.
 */
record ClientFeatures(String header, String lockedCallsToken) {

    static ClientFeatures fromClasspath() {
        LoaderOptions strict = new LoaderOptions();
        strict.setAllowDuplicateKeys(false);
        try (InputStream in = new ClassPathResource("data/parameters/quota.yaml").getInputStream()) {
            Map<String, Object> document = new Yaml(strict).load(in);
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> parameters = (List<Map<String, Object>>) document.get("parameters");
            return new ClientFeatures(text(parameters, "client_features_header"), text(parameters, "locked_calls_feature_token"));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static String text(List<Map<String, Object>> parameters, String key) {
        return parameters.stream().filter(parameter -> key.equals(parameter.get("key"))).map(parameter -> parameter.get("value"))
                .filter(value -> value instanceof String text && !text.isBlank()).map(String.class::cast).findFirst()
                .orElseThrow(() -> new IllegalStateException("quota.yaml: " + key + " is missing or not a text"));
    }

    /** Whether the header's value lists the locked calls token (case-insensitive, spaces around a token ignored). */
    boolean showsLockedCalls(String headerValue) {
        return headerValue != null && Arrays.stream(headerValue.split(",")).map(String::strip)
                .anyMatch(token -> token.toLowerCase(Locale.ROOT).equals(lockedCallsToken.toLowerCase(Locale.ROOT)));
    }

    boolean showsLockedCalls(HttpServletRequest request) {
        return showsLockedCalls(request.getHeader(header));
    }
}
