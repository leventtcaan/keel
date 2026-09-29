package app.keel.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.keel.coach.ForgedDecisionFixture;
import app.keel.engine.Decision;
import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaConstructorCall;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.Test;

/**
 * U1: the engine decides; the language model only explains. Only the engine (and the decision module that stores its
 * output) may build a Decision — the coach, the API or anything else cannot make one up (K-101's deferred promise).
 * The rule catches constructor calls; engine helpers that return a Decision (e.g. SafetyNet.bmrFloor) are reachable
 * only through the module boundary, which ModularityTests guard.
 */
class DecisionOwnershipTests {

    static final ArchRule ONLY_THE_ENGINE_BUILDS_DECISIONS = noClasses()
            .that().resideOutsideOfPackages("app.keel.engine..", "app.keel.decision..")
            .should().callConstructorWhere(DescribedPredicate.describe("builds a Decision",
                    (JavaConstructorCall call) -> call.getTargetOwner().isEquivalentTo(Decision.class)))
            .because("a decision comes from the engine, never from the coach or the API (U1)");

    @Test
    void onlyTheEngineAndTheDecisionModuleBuildDecisions() {
        ONLY_THE_ENGINE_BUILDS_DECISIONS.check(new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS).importPackages("app.keel"));
    }

    @Test
    void theRuleCatchesACoachThatBuildsADecision() {
        // Without this, a rule with nothing to catch today could be silently broken.
        assertThatThrownBy(() -> ONLY_THE_ENGINE_BUILDS_DECISIONS.check(new ClassFileImporter().importClasses(ForgedDecisionFixture.class)))
                .isInstanceOf(AssertionError.class).hasMessageContaining("ForgedDecisionFixture");
    }
}
