/**
 * Language layer: explains decisions, turns free text into records, question budget, the conversation and its memory (ADR-092; consent: it ends with a withdrawal). Never produces a decision (U1).
 * Module map and allowed dependencies: plan/kararlar/ADR-015-modul-haritasi.md.
 */
@ApplicationModule(allowedDependencies = {"decision", "nutrition", "training", "subscription", "privacy", "consent"})
package app.keel.coach;

import org.springframework.modulith.ApplicationModule;
