/**
 * Consent records: health data, Apple Health, third-party AI (ADR-007).
 * Module map and allowed dependencies: plan/kararlar/ADR-015-modul-haritasi.md.
 */
@ApplicationModule(allowedDependencies = {"identity"})
package app.keel.consent;

import org.springframework.modulith.ApplicationModule;
