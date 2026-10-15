package app.keel.shared.web;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.persistence.PostgresTestConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;

/**
 * Sign-in's address behind a proxy the server trusts (K-817): here the connection's network (127.0.0.1) is trusted, as
 * Docker's networks are on the VPS, so the address is the one X-Forwarded-For names. Two clients behind the proxy are
 * counted apart, and of a list the nearest address that is not the proxy's wins, so a client cannot put its own in front.
 * The untrusted case is RateLimitForwardedAddressTests.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(PostgresTestConfiguration.class)
@TestPropertySource(properties = {"keel.rate-limit.groups.sign-in.burst=2", "keel.rate-limit.groups.sign-in.refill-every=1h",
        "server.tomcat.remoteip.internal-proxies=127.0.0.1/32"})
class RateLimitBehindProxyTests {

    @Value("${local.server.port}")
    int port;

    @Test
    void theAddressTheProxySawIsTheOneCounted() throws Exception {
        assertThat(RateLimitForwardedAddressTests.signIn(port, "198.51.100.11")).isEqualTo(400);
        assertThat(RateLimitForwardedAddressTests.signIn(port, "198.51.100.11")).isEqualTo(400);
        assertThat(RateLimitForwardedAddressTests.signIn(port, "198.51.100.11")).isEqualTo(429);

        assertThat(RateLimitForwardedAddressTests.signIn(port, "198.51.100.12")).isEqualTo(400);
    }

    @Test
    void whatAClientWroteBeforeTheAddressTheProxySawChoosesNothing() throws Exception {
        // Caddy replaces what a client sent with the address it saw; behind a trusted proxy, an older entry is to the left.
        assertThat(RateLimitForwardedAddressTests.signIn(port, "203.0.113.1, 198.51.100.21")).isEqualTo(400);
        assertThat(RateLimitForwardedAddressTests.signIn(port, "203.0.113.2, 198.51.100.21")).isEqualTo(400);
        assertThat(RateLimitForwardedAddressTests.signIn(port, "203.0.113.3, 198.51.100.21")).isEqualTo(429);
    }
}
