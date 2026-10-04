package app.keel.identity;

import app.keel.shared.AccountId;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Component;

/** Skeleton (K-812). */
@Component
@EnableConfigurationProperties(AppleRevocationProperties.class)
class AppleRevocation {

    void revoke(AccountId account, String authorizationCode) {
    }
}
