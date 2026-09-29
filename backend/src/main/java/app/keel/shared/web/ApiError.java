package app.keel.shared.web;

import app.keel.shared.ErrorCode;

/** The contract's Error body (ADR-024): the code and its fixed message. */
record ApiError(String code, String message) {

    static ApiError of(ErrorCode code) {
        return new ApiError(code.name(), code.message());
    }
}
