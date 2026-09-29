package app.keel.shared.web;

import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import app.keel.shared.SafeLog;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Every failure answers the contract's Error (K-215, ADR-024), with the code's fixed message — never the exception's
 * text, which may hold what the request carried (V3). The log gets the code and the exception type through SafeLog.
 */
@RestControllerAdvice
class ApiErrorHandler {

    /** An error a module raises on purpose. */
    @ExceptionHandler(ApiException.class)
    ResponseEntity<ApiError> refused(ApiException e, HttpServletRequest request) {
        return answer(e.code(), e, request);
    }

    /** A body that is not valid JSON, or not the expected shape: its content is not repeated anywhere. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiError> unreadable(HttpMessageNotReadableException e, HttpServletRequest request) {
        return answer(ErrorCode.VALIDATION_FAILED, e, request);
    }

    /**
     * Spring's own request errors (no route, wrong method, bad parameter…) carry their HTTP status (they implement
     * ErrorResponse); anything else is our fault: a generic 500, and only the exception's type in the log.
     */
    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> other(Exception e, HttpServletRequest request) {
        ErrorCode code = e instanceof ErrorResponse framework ? codeFor(framework.getStatusCode().value()) : ErrorCode.INTERNAL;
        return answer(code, e, request);
    }

    private static ResponseEntity<ApiError> answer(ErrorCode code, Exception e, HttpServletRequest request) {
        SafeLog.failure(RequestLogFilter.requestId(request), code, e.getClass());
        return ResponseEntity.status(code.status()).body(ApiError.of(code));
    }

    static ErrorCode codeFor(int status) {
        return switch (status) {
            case 401 -> ErrorCode.UNAUTHENTICATED;
            case 403 -> ErrorCode.FORBIDDEN;
            case 404 -> ErrorCode.NOT_FOUND;
            case 405 -> ErrorCode.METHOD_NOT_ALLOWED;
            case 409 -> ErrorCode.CONFLICT;
            case 429 -> ErrorCode.RATE_LIMITED;
            default -> status >= 400 && status < 500 ? ErrorCode.VALIDATION_FAILED : ErrorCode.INTERNAL;
        };
    }
}
