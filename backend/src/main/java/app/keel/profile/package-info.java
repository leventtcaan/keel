/**
 * Goal, sex, schedule, program preference, food preferences.
 * Module map and allowed dependencies: plan/kararlar/ADR-015-modul-haritasi.md.
 */
@ApplicationModule(allowedDependencies = {"identity"})
package app.keel.profile;

import org.springframework.modulith.ApplicationModule;
