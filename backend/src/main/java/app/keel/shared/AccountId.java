package app.keel.shared;

import java.util.Objects;
import java.util.UUID;

/**
 * The signed-in account, as every module sees it (K-203): an opaque id. A controller asks for it as a parameter; how
 * the session proved it is identity's business.
 */
public record AccountId(UUID value) {

    public AccountId {
        Objects.requireNonNull(value, "value");
    }
}
