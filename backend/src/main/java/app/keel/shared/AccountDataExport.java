package app.keel.shared;

/**
 * A module's part of the user's data export (K-214): every module that keeps data of an account provides one, and
 * privacy collects them — privacy does not need to know the modules (a dependency the other way would be a cycle).
 */
public interface AccountDataExport {

    /** The section's name in the export: the module's name. */
    String section();

    /** Everything this module holds of the account, ready to be written as JSON. */
    Object export(AccountId account);
}
