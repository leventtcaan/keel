package app.keel.consent;

import app.keel.shared.AccountId;

/** Published when a consent is withdrawn, so the module behind it stops (K-204). */
public record ConsentWithdrawn(AccountId account, ConsentKind kind) {
}
