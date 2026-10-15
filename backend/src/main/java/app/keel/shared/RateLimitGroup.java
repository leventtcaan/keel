package app.keel.shared;

/**
 * The kinds of request that are limited (K-817, keel.rate-limit.groups.*): each is counted per account, or per address where
 * there is no account yet (sign-in). The numbers are configuration (K2); which routes belong to which group is the
 * {@link RateLimited} on the route.
 */
public enum RateLimitGroup {

    /** POST /v1/auth/apple: no session yet, so the connection's address. */
    SIGN_IN(Scope.ADDRESS),
    /** POST /v1/account/apple-revocation: each call is an ES256 signature and two calls to Apple (ADR-062). */
    APPLE_REVOCATION(Scope.ACCOUNT),
    /** The coach's words to the language model: a question and a meal in words, which cost a model call each. */
    COACH(Scope.ACCOUNT),
    /** POST /v1/meals/photo: decoded, cleaned and sent to the language model. */
    MEAL_PHOTO(Scope.ACCOUNT);

    /** Who a count belongs to. */
    public enum Scope {
        /** The signed-in account (the session token's subject). */
        ACCOUNT,
        /** The connection's address, for a route anyone can call. */
        ADDRESS
    }

    private final Scope scope;

    RateLimitGroup(Scope scope) {
        this.scope = scope;
    }

    public Scope scope() {
        return scope;
    }
}
