/**
 * Weight, waist, values derived from progress photos, trends. Photos themselves never arrive here (V1).
 * Module map and allowed dependencies: plan/kararlar/ADR-015-modul-haritasi.md, ADR-026.
 */
@ApplicationModule(allowedDependencies = {"profile", "consent", "engine"})
package app.keel.measurement;

import org.springframework.modulith.ApplicationModule;
