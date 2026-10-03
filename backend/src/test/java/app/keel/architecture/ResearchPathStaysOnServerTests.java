package app.keel.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noFields;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.keel.engine.Source;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.Test;

/**
 * A rule's research path stays on the server (K-523, ADR-041 #72): the app is told what kind of source a rule rests on,
 * never where it is written down (arastirma/…, which may name a person). Outside the engine no class holds the engine's
 * Source — a view holds the kind (decision's SourceView) — and only the kept call (DecisionJson) reads the path. A new
 * endpoint that serialized a Source, or built its own map from one, would send the path again; these rules stop it
 * where the per-endpoint tests could not.
 */
class ResearchPathStaysOnServerTests {

    static final ArchRule NO_SOURCE_FIELD_OUTSIDE_THE_ENGINE = noFields()
            .that().areDeclaredInClassesThat().resideOutsideOfPackage("app.keel.engine..")
            .should().haveRawType(Source.class)
            .because("a view sends the kind of a source, not the engine's Source with its research path (K-523)");

    static final ArchRule ONLY_THE_KEPT_CALL_READS_THE_PATH = noClasses()
            .that().resideOutsideOfPackage("app.keel.engine..")
            .and().doNotHaveFullyQualifiedName("app.keel.decision.DecisionJson")
            .should().callMethod(Source.class, "reference")
            .because("the research path is kept with the call for audit and sent nowhere (K-523)");

    private static JavaClasses product() {
        return new ClassFileImporter().withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS).importPackages("app.keel");
    }

    @Test
    void noViewHoldsTheEnginesSource() {
        NO_SOURCE_FIELD_OUTSIDE_THE_ENGINE.check(product());
    }

    @Test
    void onlyTheKeptCallReadsTheResearchPath() {
        ONLY_THE_KEPT_CALL_READS_THE_PATH.check(product());
    }

    @Test
    void theRulesCatchAViewThatCarriesTheSourceAndAMapThatReadsItsPath() {
        // Without this, rules with nothing to catch today could be silently broken.
        JavaClasses leaky = new ClassFileImporter().importClasses(LeakySourceFixture.class, LeakySourceFixture.LeakyView.class);
        assertThatThrownBy(() -> NO_SOURCE_FIELD_OUTSIDE_THE_ENGINE.check(leaky)).isInstanceOf(AssertionError.class)
                .hasMessageContaining("LeakyView");
        assertThatThrownBy(() -> ONLY_THE_KEPT_CALL_READS_THE_PATH.check(leaky)).isInstanceOf(AssertionError.class)
                .hasMessageContaining("leakyMap");
    }
}
