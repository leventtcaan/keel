/**
 * Shared types every module may use (identifiers, date ranges, units), the API's error codes ({@link app.keel.shared.ErrorCode},
 * {@link app.keel.shared.ApiException}) and the one door to the log ({@link app.keel.shared.SafeLog}, V3). The web
 * plumbing behind them — error answers, the request log, /health — is internal ({@code shared.web}, K-215). Depends on
 * no other module.
 * Declared shared in {@link app.keel.KeelApplication}, so modules use it without listing it. ADR-015.
 */
@ApplicationModule(allowedDependencies = {})
package app.keel.shared;

import org.springframework.modulith.ApplicationModule;
