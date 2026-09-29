package app.keel.shared;

/**
 * The account is to be deleted (K-214, V6): every module that keeps data of it deletes its own. In shared, not in
 * privacy, so a module privacy depends on (consent) can listen without a cycle (ADR-015).
 */
public record AccountDeletionRequested(AccountId account) {
}
