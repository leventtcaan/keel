/**
 * Weight, waist, values derived from progress photos, trends. Photos themselves never arrive here (V1).
 * Module map and allowed dependencies: plan/kararlar/ADR-015-modul-haritasi.md.
 */
@ApplicationModule(allowedDependencies = {"profile"})
package app.keel.measurement;

import org.springframework.modulith.ApplicationModule;
