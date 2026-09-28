/**
 * Meal logs, food database mapping, daily budget. Calories are ranges (U5, ADR-008).
 * Module map and allowed dependencies: plan/kararlar/ADR-015-modul-haritasi.md.
 */
@ApplicationModule(allowedDependencies = {"profile"})
package app.keel.nutrition;

import org.springframework.modulith.ApplicationModule;
