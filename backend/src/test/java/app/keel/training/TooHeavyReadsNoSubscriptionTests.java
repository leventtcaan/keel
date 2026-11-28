package app.keel.training;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.Test;

/**
 * "Too heavy?" is the free side of ADR-096: going lighter and the next session starting from the lighter load are never
 * behind the subscription (ADR-091 Ek 3: a load cut is never locked). The mark is taken, kept and read by training
 * alone (K-1262); no class there reads the subscription.
 */
class TooHeavyReadsNoSubscriptionTests {

    static final ArchRule TRAINING_READS_NO_SUBSCRIPTION = noClasses().that().resideInAPackage("app.keel.training..")
            .should().dependOnClassesThat().resideInAPackage("app.keel.subscription..")
            .because("a load cut is never locked (ADR-091 Ek 3, ADR-096)");

    @Test
    void theMarkAndTheNextSessionsLoadReadNoSubscription() {
        TRAINING_READS_NO_SUBSCRIPTION.check(new ClassFileImporter().withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("app.keel.training"));
    }
}
