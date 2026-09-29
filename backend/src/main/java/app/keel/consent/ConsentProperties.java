package app.keel.consent;

import java.util.Map;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * The version of each consent text the app shows now (K-204). A grant names the version the user saw; only the current
 * one is accepted. The texts are in data/copy/en.json › consent.*; while their version ends in "-draft" they wait for
 * the product owner's approval (ADR-020).
 */
@ConfigurationProperties("keel.consent")
record ConsentProperties(Map<ConsentKind, String> versions) {
}
