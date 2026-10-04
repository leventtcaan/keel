package app.keel.identity;

import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * The contract's /v1/account/apple-revocation (K-812, ADR-062): before the account is deleted, the phone hands over a
 * fresh Sign in with Apple authorization code, and Apple is told to end this app's sign-in for the person.
 */
@RestController
class AppleRevocationController {

    /** Contract AppleRevocationRequest. */
    record AppleRevocationRequest(String authorizationCode) {
    }

    private final AppleRevocation revocation;

    AppleRevocationController(AppleRevocation revocation) {
        this.revocation = revocation;
    }

    @PostMapping("/v1/account/apple-revocation")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void revoke(AccountId account, @RequestBody AppleRevocationRequest request) {
        if (request.authorizationCode() == null || request.authorizationCode().isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        revocation.revoke(account, request.authorizationCode());
    }
}
