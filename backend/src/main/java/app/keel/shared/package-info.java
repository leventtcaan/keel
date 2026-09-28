/**
 * Shared types every module may use (identifiers, date ranges, units). Depends on nothing.
 * Declared shared in {@link app.keel.KeelApplication}, so modules use it without listing it. ADR-015.
 */
@ApplicationModule(allowedDependencies = {})
package app.keel.shared;

import org.springframework.modulith.ApplicationModule;
