package app.keel.consent;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * The version of each consent text the app shows now (K-204). A grant names the version the user saw; only the current
 * one is accepted. The texts are in data/copy/en.json › consent.*; while their version ends in "-draft" they wait for
 * the product owner's approval (ADR-020).
 */
@ConfigurationProperties("keel.consent")
record ConsentProperties(Map<ConsentKind, String> versions, ThirdPartyAi thirdPartyAi) {

    /**
     * The AI provider the server sends to, and what it sends (V2, Apple 5.1.2(i)): a consent is to exactly these. Absent
     * until the provider is chosen (K-511) — until then the AI consent cannot be given.
     */
    record ThirdPartyAi(String provider, List<String> dataTypes) {
    }

    Optional<ThirdPartyAi> ai() {
        return Optional.ofNullable(thirdPartyAi).filter(ai -> ai.provider() != null && ai.dataTypes() != null && !ai.dataTypes().isEmpty());
    }

    /** Whether a consent record is to what the app states now: the current text, and for the AI, the current provider and data. */
    boolean current(ConsentKind kind, String textVersion, String provider, List<String> dataTypes) {
        if (textVersion == null || !textVersion.equals(versions.get(kind))) {
            return false;
        }
        if (kind != ConsentKind.THIRD_PARTY_AI) {
            return provider == null && dataTypes == null;
        }
        return ai().filter(ai -> ai.provider().equals(provider) && dataTypes != null
                && Set.copyOf(dataTypes).equals(Set.copyOf(ai.dataTypes())) && dataTypes.size() == ai.dataTypes().size()).isPresent();
    }
}
