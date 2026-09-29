package app.keel.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static org.assertj.core.api.Assertions.assertThat;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.Test;

/**
 * One egress gate (K-214, V2): only the privacy module may make an outbound HTTP call, so no module can send a user's
 * data out without passing EgressGate. (Fetching Apple's public signing keys happens inside the Nimbus library and
 * carries no user data.)
 */
class EgressRuleTests {

    static final ArchRule ONLY_PRIVACY_CALLS_OUT = noClasses().that().resideInAPackage("app.keel..")
            .and().resideOutsideOfPackage("app.keel.privacy..")
            .should().dependOnClassesThat().resideInAnyPackage("java.net.http..", "org.springframework.web.client..",
                    "org.springframework.web.reactive.function.client..", "org.springframework.web.service..")
            .orShould().dependOnClassesThat().haveFullyQualifiedName("java.net.HttpURLConnection")
            .orShould().dependOnClassesThat().haveFullyQualifiedName("java.net.Socket")
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

    /** A module that would call out on its own. */
    static final class LeakyHttpFixture {
        Object client() {
            return java.net.http.HttpClient.newHttpClient();
        }
    }
}
