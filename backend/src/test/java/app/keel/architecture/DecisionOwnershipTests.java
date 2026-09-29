package app.keel.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import app.keel.engine.Decision;
import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaConstructorCall;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.Test;

/**
 * U1: the engine decides; the language model only explains. Only the engine (and the decision module that stores its
 * output) may build a Decision — the coach, the API or anything else cannot make one up (K-101's deferred promise).
 */
class DecisionOwnershipTests {

    @Test
    void onlyTheEngineAndTheDecisionModuleBuildDecisions() {
        noClasses().that().resideOutsideOfPackages("app.keel.engine..", "app.keel.decision..")
                .should().callConstructorWhere(DescribedPredicate.describe("builds a Decision",
                        (JavaConstructorCall call) -> call.getTargetOwner().isEquivalentTo(Decision.class)))
                .because("a decision comes from the engine, never from the coach or the API (U1)")
                .check(new ClassFileImporter().withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                        .importPackages("app.keel"));
    }
}
