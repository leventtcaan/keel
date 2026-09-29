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
import java.util.Set;
import org.junit.jupiter.api.Test;

/**
 * The engine is a pure function of its Snapshot (ADR-003 §1): no framework, no I/O, no clock, no randomness.
 * Same input → same output is what makes decisions testable, reproducible and immune to pushback (U1, U2).
 *
 * <p>package-info.java is excluded: its {@code @ApplicationModule} annotation is module metadata for Spring
 * Modulith's boundary check (ModularityTests), not code the engine runs.
 */
class EnginePurityTests {

    private static final String ENGINE = "app.keel.engine..";

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
            .because("the engine gets its data in the Snapshot, never from disk, network or database (ADR-003 §1)");

    static final ArchRule NO_CLOCK_OR_RANDOMNESS = noClasses().that().resideInAPackage(ENGINE)
            .should().callMethodWhere(DescribedPredicate.describe(
                    "read the clock or a random source",
                    (JavaMethodCall call) -> readsClockOrRandomness(call.getTargetOwner().getName(), call.getName())))
            .orShould().dependOnClassesThat().haveFullyQualifiedName("java.time.Clock")
            .orShould().dependOnClassesThat().haveFullyQualifiedName("java.util.Random")
            .orShould().dependOnClassesThat().haveFullyQualifiedName("java.util.concurrent.ThreadLocalRandom")
            .orShould().dependOnClassesThat().haveFullyQualifiedName("java.security.SecureRandom")
            .because("'today' comes in the Snapshot; same input must give the same decision (ADR-003 §1, U2)");

    private static final Set<String> CLOCK_AND_RANDOM_METHODS = Set.of(
            "java.lang.System#currentTimeMillis", "java.lang.System#nanoTime",
            "java.lang.Math#random", "java.util.UUID#randomUUID");

    private static boolean readsClockOrRandomness(String owner, String method) {
        boolean timeNow = owner.startsWith("java.time.") && method.equals("now");
        return timeNow || CLOCK_AND_RANDOM_METHODS.contains(owner + "#" + method);
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
    void theRulesCatchAViolation() {
        // Guards against a vacuous rule (e.g. a wrong package name that matches nothing and so always passes).
        JavaClasses impure = new ClassFileImporter().importClasses(ImpureEngineFixture.class);

        assertThat(ONLY_JDK_AND_ITSELF.evaluate(impure).hasViolation()).isTrue();
        assertThat(NO_IO.evaluate(impure).hasViolation()).isTrue();
        assertThat(NO_CLOCK_OR_RANDOMNESS.evaluate(impure).hasViolation()).isTrue();
    }
}

