/**
 * Weekly check-in: builds the Snapshot, calls the engine, stores every decision with its input (ADR-003, ADR-005).
 * Module map and allowed dependencies: plan/kararlar/ADR-015-modul-haritasi.md, ADR-026, ADR-040 (identity: when the account began).
 */
@ApplicationModule(allowedDependencies = {"engine", "profile", "measurement", "nutrition", "training", "consent", "identity"})
package app.keel.decision;

import org.springframework.modulith.ApplicationModule;
