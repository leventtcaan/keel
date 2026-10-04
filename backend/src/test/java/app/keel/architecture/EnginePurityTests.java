package app.keel.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.ImpureEngineFixture;
import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.domain.JavaMethodCall;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

/**
 * The engine is a pure function of its Snapshot (ADR-003 §1): no framework, no I/O, no clock, no randomness,
 * no machine-dependent defaults.
 * Same input → same output is what makes decisions testable, reproducible and immune to pushback (U1, U2).
 *
 * <p>package-info.java is excluded: its {@code @ApplicationModule} annotation is module metadata for Spring
 * Modulith's boundary check (ModularityTests), not code the engine runs.
 */
class EnginePurityTests {

    private static final String ENGINE = "app.keel.engine..";

    private static final Pattern REFLECTION =
            Pattern.compile("forName|getDeclared(Method|Field|Constructor)s?|get(Method|Field|Constructor)s?");

    private static final Pattern NON_STRICT_MATH =
            Pattern.compile("log|log10|log1p|exp|expm1|pow|sin|cos|tan|asin|acos|atan|atan2|sinh|cosh|tanh|cbrt|hypot");

    private static final JavaClasses ENGINE_CLASSES = new ClassFileImporter()
            .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
            .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_PACKAGE_INFOS)
            .importPackages("app.keel.engine");

    // Everything a pure calculation needs; anything outside this list is a new kind of dependency and needs a reason.
    static final ArchRule ONLY_JDK_AND_ITSELF = noClasses().that().resideInAPackage(ENGINE)
            .should().dependOnClassesThat(DescribedPredicate.describe(
                    "are outside java.. and the engine itself",
                    (JavaClass target) -> !target.getPackageName().startsWith("java.")
                            && !target.getPackageName().equals("java")
                            && !target.getPackageName().startsWith("app.keel.engine")
                            && !target.isPrimitive()
                            && !target.isArray()))
            .because("the engine is plain Java with no framework (ADR-003 §1)");

    static final ArchRule NO_IO = noClasses().that().resideInAPackage(ENGINE)
            .should().dependOnClassesThat().resideInAnyPackage("java.net..", "java.sql..", "java.nio.file..")
            .orShould().dependOnClassesThat().haveNameMatching("java\\.io\\.(File|RandomAccess).*")
            .orShould().callMethodWhere(calls("read a classpath resource",
                    "java.lang.Class#getResource", "java.lang.Class#getResourceAsStream",
                    "java.lang.ClassLoader#getResource", "java.lang.ClassLoader#getResourceAsStream",
                    "java.lang.ClassLoader#getResources", "java.lang.ClassLoader#getSystemResource",
                    "java.lang.ClassLoader#getSystemResourceAsStream"))
            .because("the engine gets its data in the Snapshot, never from disk, classpath, network or database"
                    + " (ADR-003 §1)");

    static final ArchRule NO_CLOCK_OR_RANDOMNESS = noClasses().that().resideInAPackage(ENGINE)
            .should().callMethodWhere(DescribedPredicate.describe("read the clock",
                    (JavaMethodCall call) -> call.getTargetOwner().getPackageName().equals("java.time")
                            && call.getName().equals("now")))
            .orShould().callMethodWhere(calls("read the clock or a random source",
                    "java.lang.System#currentTimeMillis", "java.lang.System#nanoTime", "java.lang.Math#random",
                    "java.lang.StrictMath#random", "java.util.UUID#randomUUID", "java.util.Collections#shuffle"))
            .orShould().dependOnClassesThat().haveFullyQualifiedName("java.time.Clock")
            .orShould().dependOnClassesThat().haveFullyQualifiedName("java.time.InstantSource")
            .orShould().dependOnClassesThat().haveFullyQualifiedName("java.util.Date")
            .orShould().dependOnClassesThat().haveFullyQualifiedName("java.util.Calendar")
            .orShould().dependOnClassesThat().haveFullyQualifiedName("java.util.Random")
            .orShould().dependOnClassesThat().haveFullyQualifiedName("java.util.SplittableRandom")
            .orShould().dependOnClassesThat().haveFullyQualifiedName("java.util.concurrent.ThreadLocalRandom")
            .orShould().dependOnClassesThat().haveFullyQualifiedName("java.security.SecureRandom")
            .orShould().dependOnClassesThat().resideInAPackage("java.util.random..")
            .because("'today' comes in the Snapshot; same input must give the same decision (ADR-003 §1, U2)");

    static final ArchRule NO_ENVIRONMENT = noClasses().that().resideInAPackage(ENGINE)
            .should().callMethodWhere(calls("read the machine's environment or defaults",
                    "java.lang.System#getenv", "java.lang.System#getProperty", "java.lang.System#getProperties",
                    "java.time.ZoneId#systemDefault", "java.util.TimeZone#getDefault", "java.util.Locale#getDefault"))
            .orShould().dependOnClassesThat().haveFullyQualifiedName("java.lang.Thread")
            .orShould().dependOnClassesThat().haveFullyQualifiedName("java.lang.Runtime")
            .orShould().dependOnClassesThat().haveFullyQualifiedName("java.lang.ProcessBuilder")
            .orShould().dependOnClassesThat().resideInAPackage("java.lang.reflect..")
            .orShould().callMethodWhere(DescribedPredicate.describe("use reflection",
                    (JavaMethodCall call) -> call.getTargetOwner().getName().equals("java.lang.Class")
                            && REFLECTION.matcher(call.getName()).matches()))
            // java.lang.Math may use a faster, machine-specific algorithm for these (up to 1 ulp apart); StrictMath may not.
            .orShould().callMethodWhere(DescribedPredicate.describe("use machine-dependent floating-point maths",
                    (JavaMethodCall call) -> call.getTargetOwner().getName().equals("java.lang.Math")
                            && NON_STRICT_MATH.matcher(call.getName()).matches()))
            .because("a decision must not depend on which machine, time zone or thread computes it (ADR-003 §1, U2)");

    private static final List<ArchRule> ALL_RULES = List.of(ONLY_JDK_AND_ITSELF, NO_IO, NO_CLOCK_OR_RANDOMNESS, NO_ENVIRONMENT);

    private static DescribedPredicate<JavaMethodCall> calls(String description, String... ownerHashMethod) {
        Set<String> forbidden = Set.of(ownerHashMethod);
        return DescribedPredicate.describe(description,
                (JavaMethodCall call) -> forbidden.contains(call.getTargetOwner().getName() + "#" + call.getName()));
    }

    @Test
    void engineDependsOnlyOnTheJdkAndItself() {
        ONLY_JDK_AND_ITSELF.check(ENGINE_CLASSES);
    }

    @Test
    void engineDoesNoIo() {
        NO_IO.check(ENGINE_CLASSES);
    }

    @Test
    void engineNeverReadsTheClockOrRandomness() {
        NO_CLOCK_OR_RANDOMNESS.check(ENGINE_CLASSES);
    }

    @Test
    void engineNeverReadsTheEnvironment() {
        NO_ENVIRONMENT.check(ENGINE_CLASSES);
    }

    @ParameterizedTest
    @MethodSource("impureExamples")
    void theRulesCatchEveryForbiddenThing(Class<?> impure) {
        // One fixture per forbidden thing, so each rule clause is proven to fire (a rule that matches nothing
        // would otherwise pass forever).
        JavaClasses classes = new ClassFileImporter().importClasses(impure);

        boolean flagged = ALL_RULES.stream().anyMatch(rule -> rule.evaluate(classes).hasViolation());

        assertThat(flagged).as(impure.getSimpleName() + " is flagged").isTrue();
    }

    static Stream<Class<?>> impureExamples() {
        return Arrays.stream(ImpureEngineFixture.class.getDeclaredClasses());
    }
}
