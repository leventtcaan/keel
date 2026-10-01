package app.keel.consent;

import app.keel.shared.AccountId;

/**
 * Published when a consent is withdrawn, so the module behind it stops (K-204) and deletes what the consent covered
 * (K-231): handled in the withdrawal's own transaction (a plain event listener), so the withdrawal and every deletion
 * happen together or not at all. Published again by the deletion's second pass while the consent is still not given:
 * deleting must be harmless twice. Carries no health data (V3).
 */
public record ConsentWithdrawn(AccountId account, ConsentKind kind) {
}
