package app.keel.profile;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Who can hold a profile (K-225, application.yml › keel.profile): the adult age (ADR-027 #13). */
@ConfigurationProperties("keel.profile")
record ProfileLimits(int adultAge) {

    // A missing key binds 0 and would open the gate: refuse to start instead.
    ProfileLimits {
        if (adultAge < 1) {
            throw new IllegalStateException("keel.profile.adult-age must be set, was " + adultAge);
        }
    }
}
