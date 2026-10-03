/**
 * Entitlements and daily quota counters (ADR-012); the day is the user's own (profile: the time zone, K-508).
 * Module map and allowed dependencies: plan/kararlar/ADR-015-modul-haritasi.md.
 */
@ApplicationModule(allowedDependencies = {"identity", "profile"})
package app.keel.subscription;

import org.springframework.modulith.ApplicationModule;
