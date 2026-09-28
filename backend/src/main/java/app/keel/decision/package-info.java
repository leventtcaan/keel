/**
 * Weekly check-in: builds the Snapshot, calls the engine, stores every decision with its input (ADR-003, ADR-005).
 * Module map and allowed dependencies: plan/kararlar/ADR-015-modul-haritasi.md.
 */
@ApplicationModule(allowedDependencies = {"engine", "profile", "measurement", "nutrition", "training"})
package app.keel.decision;

import org.springframework.modulith.ApplicationModule;
