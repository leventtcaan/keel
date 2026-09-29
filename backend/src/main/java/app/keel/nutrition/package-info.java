/**
 * Meal logs, food database mapping, daily budget. Calories are ranges (U5, ADR-008).
 * Module map and allowed dependencies: plan/kararlar/ADR-015-modul-haritasi.md, ADR-026.
 */
@ApplicationModule(allowedDependencies = {"profile", "consent"})
package app.keel.nutrition;

import org.springframework.modulith.ApplicationModule;
