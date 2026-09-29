package app.keel.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static org.assertj.core.api.Assertions.assertThat;

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
import java.util.regex.Pattern;
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

    private static final Pattern HEALTH_WORD = Pattern.compile(
            "WEIGHT|KG|KCAL|CALOR|WAIST|SLEEP|STEP|HEART|MEAL|FOOD|PHOTO|BODY|FAT|PROTEIN|CARB|MACRO|CYCLE|MENSTRU|HEALTH|"
                    + "INTAKE|ENERGY|BMI|AGE|BIRTH|SEX|HEIGHT|ANSWER|MESSAGE|BODY|PAYLOAD|QUERY|PATH");

    static final ArchRule ONLY_SAFE_LOG_LOGS = noClasses().that().resideInAPackage("app.keel..")
            .and().doNotHaveFullyQualifiedName(SafeLog.class.getName())
            .should().dependOnClassesThat().resideInAnyPackage("org.slf4j..", "java.util.logging..", "java.lang.System$Logger..",
                    "org.apache.commons.logging..", "org.apache.logging..", "ch.qos.logback..")
            .orShould().accessField(System.class, "out")
            .orShould().accessField(System.class, "err")
            .orShould().callMethodWhere(DescribedPredicate.describe("print a stack trace",
                    (JavaMethodCall call) -> call.getName().equals("printStackTrace")
                            && call.getTargetOwner().isAssignableTo(Throwable.class)))
            .orShould().callMethod(System.class, "getLogger", String.class)
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
    void theWhitelistHasNoFieldThatCouldCarryHealthData() {
        assertThat(LogField.values()).isNotEmpty()
                .allSatisfy(field -> assertThat(HEALTH_WORD.matcher(field.name()).find()).as(field.name()).isFalse());
    }

    static Stream<Class<?>> leakyExamples() {
        return Arrays.stream(LeakyLoggingFixture.class.getDeclaredClasses());
    }
}
