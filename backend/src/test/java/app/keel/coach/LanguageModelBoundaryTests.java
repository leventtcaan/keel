package app.keel.coach;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static org.assertj.core.api.Assertions.assertThat;

import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.Test;

/**
 * The model is reached through CoachModel only (K-503): CoachModel puts every call through the privacy gate, so nothing
 * else may call LanguageModel directly — a new feature that did would send the user's words without the consent check.
 */
class LanguageModelBoundaryTests {

    static final ArchRule ONLY_COACH_MODEL_CALLS_THE_MODEL = noClasses()
            .that().doNotHaveFullyQualifiedName(CoachModel.class.getName())
            .and().doNotHaveFullyQualifiedName(FakeLanguageModel.class.getName())
            .should().callMethod(LanguageModel.class, "complete", ModelRequest.class)
            .because("every call to a language model goes through the privacy gate, in CoachModel (K-503, V2)");

    @Test
    void onlyCoachModelCallsTheModel() {
        ONLY_COACH_MODEL_CALLS_THE_MODEL.check(new ClassFileImporter().withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("app.keel"));
    }

    @Test
    void theRuleCatchesAFeatureThatCallsTheModelItself() {
        assertThat(ONLY_COACH_MODEL_CALLS_THE_MODEL.evaluate(new ClassFileImporter().importClasses(BypassingFeatureFixture.class))
                .hasViolation()).isTrue();
    }
}
