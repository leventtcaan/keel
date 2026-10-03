package app.keel.coach;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static org.assertj.core.api.Assertions.assertThat;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaAccess;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.Test;

/**
 * The model is reached through CoachModel only (K-503, ADR-042): CoachModel puts every call through the privacy gate, so
 * nothing else may reach a model's {@code complete} — through the port, an adapter's own class, a method reference, a
 * narrower port or a subclass (K-503 review: a call written against the port alone left those open). What CoachModel
 * does inside is CoachModelTests'.
 */
class LanguageModelBoundaryTests {

    static final DescribedPredicate<JavaAccess<?>> A_MODELS_COMPLETE = DescribedPredicate.describe("reach a language model's complete",
            (JavaAccess<?> access) -> access.getName().equals("complete") && access.getTargetOwner().isAssignableTo(LanguageModel.class));

    static final ArchRule ONLY_COACH_MODEL_CALLS_THE_MODEL = noClasses()
            .that().doNotHaveFullyQualifiedName(CoachModel.class.getName())
            .should().accessTargetWhere(A_MODELS_COMPLETE)
            .because("every call to a language model goes through the privacy gate, in CoachModel (K-503, V2)");

    @Test
    void onlyCoachModelCallsTheModel() {
        ONLY_COACH_MODEL_CALLS_THE_MODEL.check(new ClassFileImporter().withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("app.keel"));
    }

    @ParameterizedTest
    @ValueSource(classes = {BypassingFeatureFixture.class, BypassingFeatureFixture.ThroughTheAdapter.class,
            BypassingFeatureFixture.ThroughAReference.class, BypassingFeatureFixture.ThroughANarrowerPort.class,
            BypassingFeatureFixture.ThroughASubclass.class})
    void theRuleCatchesEveryWayPastTheGate(Class<?> bypass) {
        assertThat(ONLY_COACH_MODEL_CALLS_THE_MODEL.evaluate(new ClassFileImporter().importClasses(bypass)).hasViolation())
                .as(bypass.getSimpleName()).isTrue();
    }
}
