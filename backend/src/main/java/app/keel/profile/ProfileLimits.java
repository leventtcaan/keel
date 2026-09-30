package app.keel.profile;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Who can hold a profile (K-225, application.yml › keel.profile): the adult age (ADR-027 #13). */
@ConfigurationProperties("keel.profile")
record ProfileLimits(int adultAge) {
}
