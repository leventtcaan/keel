package app.keel.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static org.assertj.core.api.Assertions.assertThat;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import java.util.Set;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * One egress gate (K-214, V2): only the privacy module may reach the network, so no module can send a user's data out
 * without passing EgressGate. An allowlist, not a list of HTTP clients (K-214 review): anything in java.net but URI,
 * TLS sockets, channels, Spring's and other HTTP clients. One exception, by name: identity hands Apple's public-key URL
 * to Nimbus, which fetches the keys (no user data goes out).
 */
class EgressRuleTests {

    private static final String APPLE_KEYS = "app.keel.identity.IdentityConfiguration";

    static final DescribedPredicate<JavaClass> NETWORK = DescribedPredicate.describe("reach the network",
            (JavaClass type) -> type.getPackageName().equals("java.net")
                    && !Set.of("java.net.URI", "java.net.URISyntaxException").contains(type.getName())
                    || Stream.of("java.net.http", "javax.net", "java.nio.channels", "org.springframework.http.client",
                            "org.springframework.web.client", "org.springframework.web.reactive.function.client",
                            "org.springframework.web.service", "okhttp3", "org.apache.hc", "org.apache.http")
                    .anyMatch(root -> type.getPackageName().equals(root) || type.getPackageName().startsWith(root + ".")));

    static final ArchRule ONLY_PRIVACY_CALLS_OUT = noClasses().that().resideInAPackage("app.keel..")
            .and().resideOutsideOfPackage("app.keel.privacy..")
            .and().doNotHaveFullyQualifiedName(APPLE_KEYS)
            .should().dependOnClassesThat(NETWORK)
            .because("data leaves the server only through privacy's EgressGate (V2, K-214)");

    @Test
    void onlyThePrivacyModuleMakesOutboundCalls() {
        ONLY_PRIVACY_CALLS_OUT.check(new ClassFileImporter().withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("app.keel"));
    }

    @Test
    void theRuleSeesAnHttpClientElsewhere() {
        JavaClasses leaky = new ClassFileImporter().importClasses(LeakyHttpFixture.class);

        assertThat(ONLY_PRIVACY_CALLS_OUT.evaluate(leaky).hasViolation()).isTrue();
    }

    @ParameterizedTest
    @MethodSource("waysOut")
    void theRuleSeesEveryWayOut(Class<?> leaky) {
        // One fixture per way a module could reach the network without an HTTP client class (K-214 review).
        assertThat(ONLY_PRIVACY_CALLS_OUT.evaluate(new ClassFileImporter().importClasses(leaky)).hasViolation())
                .as(leaky.getSimpleName()).isTrue();
    }

    static Stream<Class<?>> waysOut() {
        return Stream.of(UrlStreamFixture.class, SpringRequestFactoryFixture.class, HttpsFixture.class, SocketChannelFixture.class);
    }

    static final class UrlStreamFixture {
        Object read() throws Exception {
            return java.net.URI.create("https://example.com").toURL().openStream();
        }
    }

    static final class SpringRequestFactoryFixture {
        Object factory() {
            return new org.springframework.http.client.JdkClientHttpRequestFactory();
        }
    }

    static final class HttpsFixture {
        Object open(javax.net.ssl.SSLSocketFactory factory) throws Exception {
            return factory.createSocket("example.com", 443);
        }
    }

    static final class SocketChannelFixture {
        Object open() throws Exception {
            return java.nio.channels.SocketChannel.open();
        }
    }

    /** A module that would call out on its own. */
    static final class LeakyHttpFixture {
        Object client() {
            return java.net.http.HttpClient.newHttpClient();
        }
    }
}
