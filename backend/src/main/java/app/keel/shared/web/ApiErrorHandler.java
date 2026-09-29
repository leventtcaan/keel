package app.keel.shared.web;

import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import app.keel.shared.SafeLog;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
        if (e instanceof ErrorResponse framework) {
            // Keep the headers the status needs (Allow on 405, Retry-After on 429/503); never the reason text.
            return answer(ErrorCode.forStatus(framework.getStatusCode().value()), e, request, framework.getHeaders());
        }
        return answer(ErrorCode.INTERNAL, e, request);
    }

    private static ResponseEntity<ApiError> answer(ErrorCode code, Exception e, HttpServletRequest request) {
        return answer(code, e, request, HttpHeaders.EMPTY);
    }

    // JSON whatever the client's Accept says: left to content negotiation, an Accept: text/html would make this handler
    // fail, and the container would log the original exception's message (K-215 review).
    private static ResponseEntity<ApiError> answer(ErrorCode code, Exception e, HttpServletRequest request, HttpHeaders headers) {
        SafeLog.failure(RequestLogFilter.requestId(request), code, e);
        return ResponseEntity.status(code.status()).headers(headers).contentType(MediaType.APPLICATION_JSON).body(ApiError.of(code));
    }
}
