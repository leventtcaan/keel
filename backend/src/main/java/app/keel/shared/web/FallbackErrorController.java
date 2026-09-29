package app.keel.shared.web;

import app.keel.shared.ErrorCode;
import app.keel.shared.SafeLog;
import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.webmvc.error.ErrorController;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * What the servlet container forwards to when a failure escapes Spring MVC — a failing filter, say (K-215 review).
 * Replaces Boot's own error page, which would answer HTML or a body with the raw path: the contract's Error in JSON,
 * the failure logged through SafeLog by type only.
 */
@RestController
class FallbackErrorController implements ErrorController {

    @RequestMapping("${server.error.path:/error}")
    ResponseEntity<ApiError> error(HttpServletRequest request) {
        Object status = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        ErrorCode code = ErrorCode.forStatus(status instanceof Integer value ? value : 500);
        if (request.getAttribute(RequestDispatcher.ERROR_EXCEPTION) instanceof Throwable failure) {
            SafeLog.failure(RequestLogFilter.requestId(request), code, failure);
        }
        return ResponseEntity.status(code.status()).contentType(MediaType.APPLICATION_JSON).body(ApiError.of(code));
    }
}
