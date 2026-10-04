/**
 * The single egress gate, data export, account deletion event (ADR-004, ADR-007).
 * Module map and allowed dependencies: plan/kararlar/ADR-015-modul-haritasi.md.
 */
@ApplicationModule(allowedDependencies = {"consent", "identity"})
package app.keel.privacy;

import org.springframework.modulith.ApplicationModule;
