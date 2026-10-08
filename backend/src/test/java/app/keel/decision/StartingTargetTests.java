package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.InitialTarget;
import app.keel.engine.ParameterDomain;
import app.keel.engine.ParameterKey;
import app.keel.engine.ParameterSet;
import app.keel.engine.Phase;
import app.keel.engine.Sex;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.yaml.snakeyaml.Yaml;

/**
 * The plan-ready screen's food row (K-989, ADR-072 #6): the first plan's target as one number, the maintenance estimate it
 * comes from as a range (U5), and how long the scale watches it, from the parameters for the user's sex (G2 K-8).
 */
class StartingTargetTests {

    private static final ParameterSet PARAMETERS = engineParameters();
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 12);
    private static final InitialTarget.Estimate ESTIMATE = new InitialTarget.Estimate(1822, 2916, 2479, 3353);

    @Test
    void theTargetIsTheFirstPlansAndTheEstimateARange() {
        CallStore.Plan first = new CallStore.Plan(Phase.CUT, TODAY, TODAY, 2916, true, null);

        StartingTarget starting = StartingTarget.of(first, ESTIMATE, PARAMETERS.forSex(Sex.MALE));

        assertThat(starting.targetKcal()).isEqualTo(2916);
        assertThat(starting.maintenanceKcal()).isEqualTo(new StartingTarget.Range(2479, 3353));
    }

    @Test
    void theScaleWatchesForTheParametersDaysForTheUsersSex() {
        CallStore.Plan first = new CallStore.Plan(Phase.BULK, TODAY, TODAY, 2916, true, null);

        assertThat(StartingTarget.of(first, ESTIMATE, PARAMETERS.forSex(Sex.MALE)).observationDays())
                .isEqualTo(PARAMETERS.forSex(Sex.MALE).wholeNumber(ParameterKey.MAINTENANCE_OBSERVATION_DAYS)).isEqualTo(14);
        assertThat(StartingTarget.of(first, ESTIMATE, PARAMETERS.forSex(Sex.FEMALE)).observationDays())
                .isEqualTo(PARAMETERS.forSex(Sex.FEMALE).wholeNumber(ParameterKey.MAINTENANCE_OBSERVATION_DAYS)).isEqualTo(28);
    }

    private static ParameterSet engineParameters() {
        Map<String, Object> documents = new HashMap<>();
        for (ParameterDomain domain : ParameterDomain.values()) {
            try (InputStream in = new ClassPathResource("data/parameters/" + domain.fileName()).getInputStream()) {
                documents.put(domain.fileName(), new Yaml().load(in));
            } catch (IOException e) {
                throw new IllegalStateException(domain.fileName(), e);
            }
        }
        return ParameterSet.fromDocuments(documents);
    }
}
