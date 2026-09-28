/**
 * Language layer: explains decisions, turns free text into records, question budget. Never produces a decision (U1).
 * Module map and allowed dependencies: plan/kararlar/ADR-015-modul-haritasi.md.
 */
@ApplicationModule(allowedDependencies = {"decision", "nutrition", "training", "subscription", "privacy"})
package app.keel.coach;

import org.springframework.modulith.ApplicationModule;
