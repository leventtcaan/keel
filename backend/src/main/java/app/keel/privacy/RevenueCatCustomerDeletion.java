package app.keel.privacy;

import app.keel.shared.AccountDeletionRequested;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

/**
 * The deleted account's customer at RevenueCat goes too (K-704, M8 inventory gap 4, V6): it holds the purchases tied to the
 * account's opaque id. A listener of its own, as every module's deletion is, so RevenueCat being down fails only this one: the
 * rest of the account is deleted, and the event registry keeps this publication until DeletionRetry resends it. Deleting
 * twice is harmless (RevenueCat: 200 and 404 are both "deleted"), and the second pass after the DELETE (DeletionSweep)
 * repeats it for a customer a webhook's refresh made in between. No key set: nothing is sent; in production the deletion
 * stays pending until a key is set (RevenueCatRest.delete), elsewhere there is nothing to wait for.
 */
@Component
class RevenueCatCustomerDeletion {

    private final RevenueCatRest revenueCat;

    RevenueCatCustomerDeletion(RevenueCatRest revenueCat) {
        this.revenueCat = revenueCat;
    }

    @ApplicationModuleListener
    void on(AccountDeletionRequested deletion) {
        revenueCat.delete(deletion.account());
    }
}
