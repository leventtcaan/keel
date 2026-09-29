package app.keel.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static org.assertj.core.api.Assertions.assertThat;

import app.keel.shared.ErrorCode;
import app.keel.shared.LeakyLoggingFixture;
import app.keel.shared.LogField;
import app.keel.shared.SafeLog;
import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.domain.JavaMethodCall;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * Health data never reaches the log (V3, K-215): every log line goes through {@link SafeLog}, whose fields are the
 * {@link LogField} whitelist. A class that logs any other way, or a whitelist field that could carry health data,
 * turns this red.
 */
class LogWhitelistTests {

    // The whitelist, pinned: adding a field is a reviewed change to this line (V3), not a quiet addition to the enum.
    private static final List<String> APPROVED_FIELDS =
            List.of("REQUEST_ID", "METHOD", "ROUTE", "STATUS", "DURATION_MS", "ERROR_CODE", "EXCEPTION", "AT");
    // What SafeLog's public methods may take: ids, a method and route template (checked inside), counts, a code, a failure.
    private static final Set<Class<?>> APPROVED_PARAMETERS =
            Set.of(UUID.class, String.class, int.class, long.class, ErrorCode.class, Throwable.class);

    static final ArchRule ONLY_SAFE_LOG_LOGS = noClasses().that().resideInAPackage("app.keel..")
            .and().doNotHaveFullyQualifiedName(SafeLog.class.getName())
            .should().dependOnClassesThat().resideInAnyPackage("org.slf4j..", "java.util.logging..", "org.apache.commons.logging..",
                    "org.apache.logging..", "ch.qos.logback..", "org.springframework.core.log..")
            .orShould().accessField(System.class, "out")
            .orShould().accessField(System.class, "err")
            .orShould().callMethodWhere(DescribedPredicate.describe("print a stack trace",
                    (JavaMethodCall call) -> call.getName().equals("printStackTrace")
                            && call.getTargetOwner().isAssignableTo(Throwable.class)))
            .orShould().callMethodWhere(DescribedPredicate.describe("get a System.Logger",
                    (JavaMethodCall call) -> call.getName().equals("getLogger") && call.getTargetOwner().isEquivalentTo(System.class)))
            .because("every log line goes through SafeLog's whitelist, so health data cannot reach the log (V3)");

    @Test
    void onlySafeLogWritesLogs() {
        JavaClasses main = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("app.keel");

        ONLY_SAFE_LOG_LOGS.check(main);
    }

    @ParameterizedTest
    @MethodSource("leakyExamples")
    void theRuleCatchesEveryOtherWayOfLogging(Class<?> leaky) {
        // One fixture per way of logging, so each clause is proven to fire.
        assertThat(ONLY_SAFE_LOG_LOGS.evaluate(new ClassFileImporter().importClasses(leaky)).hasViolation())
                .as(leaky.getSimpleName()).isTrue();
    }

    @Test
    void theWhitelistIsTheApprovedOne() {
        assertThat(Stream.of(LogField.values()).map(Enum::name).toList()).containsExactlyElementsOf(APPROVED_FIELDS);
    }

    @Test
    void safeLogTakesOnlyApprovedTypes() {
        // A SafeLog.x(double kg) or x(Object value) would let health data in whatever the field is called.
        List<String> loose = Arrays.stream(SafeLog.class.getMethods())
                .filter(method -> method.getDeclaringClass() == SafeLog.class)
                .flatMap(method -> Arrays.stream(method.getParameterTypes())
                        .filter(type -> !APPROVED_PARAMETERS.contains(type))
                        .map(type -> method.getName() + "(" + type.getSimpleName() + ")"))
                .toList();

        assertThat(loose).isEmpty();
    }

    static Stream<Class<?>> leakyExamples() {
        return Arrays.stream(LeakyLoggingFixture.class.getDeclaredClasses());
    }
}
