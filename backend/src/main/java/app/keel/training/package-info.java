/**
 * Programs, sessions, sets, exercise catalog.
 * Module map and allowed dependencies: plan/kararlar/ADR-015-modul-haritasi.md.
 */
@ApplicationModule(allowedDependencies = {"profile"})
package app.keel.training;

import org.springframework.modulith.ApplicationModule;
