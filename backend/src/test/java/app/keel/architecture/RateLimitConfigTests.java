package app.keel.architecture;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.shared.RateLimitGroup;
import app.keel.shared.RateLimited;
import java.io.IOException;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.yaml.snakeyaml.Yaml;

/**
 * The request limits (K-817) as the server runs with them: every limited group has numbers in application.yml (K2); the
 * client's address is the container's, which trusts X-Forwarded-For only from the Docker networks Caddy is on (Caddy
 * itself overwrites what a client sends, deploy/Caddyfile); and every limited route says so in the contract (429 with
 * Retry-After), so the phone's generated types know it.
 */
class RateLimitConfigTests {

    private static final Path CONTRACT = Path.of("../contracts/openapi.yaml");

    @Test
    void theServersNumbersAreInItsOwnConfigurationForEveryGroup() {
        ProductionProfileTests.server("prod").run(context -> {
            Binder binder = Binder.get(context.getEnvironment());
            Map<String, Object> groups = binder.bind("keel.rate-limit.groups", Bindable.mapOf(String.class, Object.class)).get();

            assertThat(groups.keySet()).containsExactlyInAnyOrder("sign-in", "apple-revocation", "coach", "meal-photo");
            assertThat(binder.bind("keel.rate-limit.max-keys", Integer.class).get()).isPositive();
        });
    }

    @Test
    void theContainerTakesTheClientAddressFromXForwardedForOnlyWhenTheProxyIsOnTheDockerNetworks() {
        ProductionProfileTests.server("prod").run(context -> {
            var env = context.getEnvironment();
            String trusted = env.getProperty("server.tomcat.remoteip.internal-proxies");

            assertThat(env.getProperty("server.forward-headers-strategy")).isEqualTo("native");
            assertThat(trusted).as("trusted proxies").isNotBlank();
            // Docker's default address pools are all a bridge network gets; nothing wider (loopback, 10/8, link-local, CGNAT,
            // IPv6 ranges) so a connection that is not Caddy's can never choose its address.
            assertThat(List.of(trusted.split("\\s*,\\s*"))).containsExactlyInAnyOrder("172.16.0.0/12", "192.168.0.0/16");
            assertThat(env.getProperty("server.tomcat.remoteip.remote-ip-header", "X-Forwarded-For")).isEqualTo("X-Forwarded-For");
        });
    }

    @Test
    @SuppressWarnings("unchecked")
    void everyLimitedRouteDocumentsItsTooManyRequestsAnswerWithRetryAfter() throws Exception {
        Map<String, Object> contract = new Yaml().load(Files.readString(CONTRACT));
        Map<String, Object> paths = (Map<String, Object>) contract.get("paths");
        Map<String, Object> responses = (Map<String, Object>) ((Map<String, Object>) contract.get("components")).get("responses");
        Map<String, Object> rateLimited = (Map<String, Object>) responses.get("RateLimited");
        assertThat(((Map<String, Object>) rateLimited.get("headers"))).containsKey("Retry-After");

        Set<RateLimitGroup> used = new TreeSet<>();
        List<String> limited = limitedRoutes(used);
        assertThat(limited).isNotEmpty();
        for (String route : limited) {
            String path = route.substring(route.indexOf(' ') + 1);
            Map<String, Object> operation = (Map<String, Object>) ((Map<String, Object>) paths.get(path)).get("post");
            Map<String, Object> answers = (Map<String, Object>) operation.get("responses");
            assertThat(answers).as(route).containsKey("429");
            assertThat(((Map<String, Object>) answers.get("429")).get("$ref")).as(route).isEqualTo("#/components/responses/RateLimited");
        }
        assertThat(used).as("a group no route uses is a limit that limits nothing").containsExactlyInAnyOrder(RateLimitGroup.values());
    }

    /** "POST /v1/..." of every handler method in the application that carries {@link RateLimited}. */
    private static List<String> limitedRoutes(Set<RateLimitGroup> groups) throws ClassNotFoundException {
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));
        List<String> routes = new ArrayList<>();
        for (BeanDefinition controller : scanner.findCandidateComponents("app.keel")) {
            if (controller.getBeanClassName().contains("Tests")) {
                continue;
            }
            Class<?> type = Class.forName(controller.getBeanClassName());
            RequestMapping base = AnnotatedElementUtils.findMergedAnnotation(type, RequestMapping.class);
            String prefix = base == null || base.value().length == 0 ? "" : base.value()[0];
            for (Method method : type.getDeclaredMethods()) {
                RateLimited limit = method.getAnnotation(RateLimited.class);
                if (limit == null) {
                    continue;
                }
                groups.add(limit.value());
                PostMapping post = method.getAnnotation(PostMapping.class);
                assertThat(post).as(method + " is limited, so it is a POST the contract lists").isNotNull();
                String route = post.value().length > 0 ? post.value()[0] : "";
                routes.add("POST " + prefix + route);
            }
        }
        return routes;
    }
}
