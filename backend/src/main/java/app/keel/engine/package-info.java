/**
 * Pure, deterministic decision engine: rules, parameters, Snapshot in, Decision out. No Spring, no database, no clock (ADR-003).
 * Module map and allowed dependencies: plan/kararlar/ADR-015-modul-haritasi.md.
 */
@ApplicationModule(allowedDependencies = {})
package app.keel.engine;

import org.springframework.modulith.ApplicationModule;
