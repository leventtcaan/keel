package app.keel.consent;

/**
 * For every module's tests: the version of each consent text the server takes as current (application.yml ›
 * keel.consent.versions), in one place. A revised text changes it here, and the requests that give a consent follow;
 * what the tests assert does not change (K-429). ConsentTests checks these against the server's own versions.
 */
public final class ConsentTextVersions {

    public static final String HEALTH_DATA = "3";
    public static final String APPLE_HEALTH = "1-draft";
    public static final String THIRD_PARTY_AI = "1-draft";

    private ConsentTextVersions() {
    }
}
