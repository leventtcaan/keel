/**
 * Entitlements and daily quota counters (ADR-012).
 * Module map and allowed dependencies: plan/kararlar/ADR-015-modul-haritasi.md.
 */
@ApplicationModule(allowedDependencies = {"identity"})
package app.keel.subscription;

import org.springframework.modulith.ApplicationModule;
