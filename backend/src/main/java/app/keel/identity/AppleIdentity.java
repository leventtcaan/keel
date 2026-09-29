package app.keel.identity;

/** Who Apple says signed in: Apple's stable user identifier for our team (the token's {@code sub}). */
public record AppleIdentity(String subject) {
}
