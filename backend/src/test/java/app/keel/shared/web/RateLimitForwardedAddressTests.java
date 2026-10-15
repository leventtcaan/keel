package app.keel.shared.web;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.persistence.PostgresTestConfiguration;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;

/**
 * Where sign-in's address comes from, on a real Tomcat (K-817): MockMvc has no servlet container, so it cannot see
 * server.forward-headers-strategy at work. The client here connects from 127.0.0.1 and sends X-Forwarded-For, as Caddy
 * would. The server's own trusted networks (application.yml) are Docker's, which a local connection is not: the header is
 * ignored and every request is the one address. RateLimitBehindProxyTests is the same with the connection's network trusted.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(PostgresTestConfiguration.class)
@TestPropertySource(properties = {"keel.rate-limit.groups.sign-in.burst=2", "keel.rate-limit.groups.sign-in.refill-every=1h"})
class RateLimitForwardedAddressTests {

    private static final HttpClient CLIENT = HttpClient.newHttpClient();

    @Value("${local.server.port}")
    int port;

    /** The status of a sign-in with nothing in it (400, or 429 when the address is past its burst). */
    static int signIn(int port, String forwardedFor) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/v1/auth/apple"))
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString("{\"identityToken\":\"\",\"nonce\":\"\"}"));
        if (forwardedFor != null) {
            request.header("X-Forwarded-For", forwardedFor);
        }
        return CLIENT.send(request.build(), HttpResponse.BodyHandlers.discarding()).statusCode();
    }

    @Test
    void aHeaderFromAConnectionThatIsNotTheProxyChoosesNothing() throws Exception {
        assertThat(signIn(port, "198.51.100.1")).isEqualTo(400);
        assertThat(signIn(port, "198.51.100.2")).isEqualTo(400);

        assertThat(signIn(port, "198.51.100.3")).isEqualTo(429);
        assertThat(signIn(port, null)).isEqualTo(429);
    }
}
