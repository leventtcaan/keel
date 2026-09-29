package app.keel.identity;

import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Sign in with Apple, refresh, sign out (contract /v1/auth/*, K-203). */
@RestController
@RequestMapping("/v1/auth")
class AuthController {

    /** Contract AppleSignIn. The authorization code is taken but not yet exchanged: that needs the Apple key (K-214). */
    record AppleSignIn(String identityToken, String nonce, String authorizationCode) {
    }

    record RefreshRequest(String refreshToken) {
    }

    /** Contract Session. */
    record Session(String accessToken, Instant accessTokenExpiresAt, String refreshToken, boolean newAccount) {
    }

    private final AppleIdentityVerifier apple;
    private final Accounts accounts;
    private final SessionTokens sessions;
    private final RefreshTokens refreshTokens;

    AuthController(AppleIdentityVerifier apple, Accounts accounts, SessionTokens sessions, RefreshTokens refreshTokens) {
        this.apple = apple;
        this.accounts = accounts;
        this.sessions = sessions;
        this.refreshTokens = refreshTokens;
    }

    @PostMapping("/apple")
    @Transactional
    Session signIn(@RequestBody AppleSignIn request) {
        if (blank(request.identityToken()) || blank(request.nonce())) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        Accounts.SignedIn signedIn = accounts.findOrCreate(apple.verify(request.identityToken(), request.nonce()));
        SessionTokens.Access access = sessions.issue(signedIn.account());
        return new Session(access.token(), access.expiresAt(), refreshTokens.start(signedIn.account()), signedIn.created());
    }

    @PostMapping("/refresh")
    Session refresh(@RequestBody RefreshRequest request) {
        RefreshTokens.Rotated rotated = refreshTokens.rotate(request.refreshToken());
        SessionTokens.Access access = sessions.issue(rotated.account());
        return new Session(access.token(), access.expiresAt(), rotated.refreshToken(), false);
    }

    @PostMapping("/sign-out")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void signOut(@RequestBody RefreshRequest request) {
        refreshTokens.end(request.refreshToken());
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
