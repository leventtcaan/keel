package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.CheckIn;
import app.keel.engine.DeclaredContext;
import app.keel.engine.ParameterSet;
import app.keel.engine.Parameters;
import app.keel.engine.ParameterDomain;
import app.keel.engine.Phase;
import app.keel.engine.Sex;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.yaml.snakeyaml.Yaml;
import tools.jackson.databind.json.JsonMapper;

/**
 * What a call read, as the rows "Why this call" shows (K-519, Ö-25, U3's "which data"): from the call's own stored
 * snapshot — the decision window's weekly means and the change between them, the adherence, the answers given, where
 * training stands, the target, a state declared. Nothing the call did not read; never a fat number (U4).
 */
class DecisionBasisTests {

    private static final Parameters MALE = engineParameters().forSex(Sex.MALE);
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 5);

    @Test
    void theWindowsWeeksOldestFirstAndTheirChangePerWeek() {
        // A man's window is 21 days: three weeks ending today, a week ago and two weeks ago.
        DecisionBasis basis = DecisionBasis.of(snapshot(TODAY.minusDays(60), weeks("82.0", "81.5", "81.0")), MALE);

        assertThat(basis.weeks()).extracting(DecisionBasis.WeekMean::ends).containsExactly(TODAY.minusDays(14), TODAY.minusDays(7), TODAY);
        assertThat(basis.weeks()).extracting(DecisionBasis.WeekMean::kg).usingElementComparator(BigDecimal::compareTo)
                .containsExactly(new BigDecimal("82.0"), new BigDecimal("81.5"), new BigDecimal("81.0"));
        assertThat(basis.changeKgPerWeek()).isEqualByComparingTo("-0.5");
        assertThat(basis.phase()).isEqualTo(Phase.CUT);
    }

    @Test
    void aWeekWithNoWeighInIsNoRowAndTheChangeSpansTheWeeksThatHaveOne() {
        DecisionBasis basis = DecisionBasis.of(snapshot(TODAY.minusDays(60), weeks("82.0", null, "81.0")), MALE);

        assertThat(basis.weeks()).extracting(DecisionBasis.WeekMean::ends).containsExactly(TODAY.minusDays(14), TODAY);
        assertThat(basis.changeKgPerWeek()).isEqualByComparingTo("-0.5");
    }

    @Test
    void weighInsFromBeforeThePlanBeganAreNotItsData() {
        // The plan began ten days ago: the week ending two weeks ago is the old plan's, and of last week only four days count.
        List<StoredSnapshot.Weight> weights = weeks("90.0", "82.0", "81.0");
        DecisionBasis basis = DecisionBasis.of(snapshot(TODAY.minusDays(10), weights), MALE);

        assertThat(basis.weeks()).extracting(DecisionBasis.WeekMean::ends).containsExactly(TODAY.minusDays(7), TODAY);
        assertThat(basis.changeKgPerWeek()).isEqualByComparingTo("-1.0");
    }

    @Test
    void oneWeekHasNoChangeToShow() {
        DecisionBasis basis = DecisionBasis.of(snapshot(TODAY.minusDays(60), weeks(null, null, "81.0")), MALE);

        assertThat(basis.weeks()).hasSize(1);
        assertThat(basis.changeKgPerWeek()).isNull();
    }

    @Test
    void theAnswersGivenAndNotTheOnesLeftOpen() {
        StoredSnapshot.Answered answered = new StoredSnapshot.Answered(CheckIn.Look.BETTER, CheckIn.Training.UNKNOWN, CheckIn.Recovery.POOR,
                CheckIn.Waist.UNKNOWN, new BigDecimal("0.8"), CheckIn.Appetite.UNKNOWN);
        DecisionBasis basis = DecisionBasis.of(snapshot(TODAY.minusDays(60), weeks("82.0", "81.5", "81.0"), answered), MALE);

        assertThat(basis.adherence()).isEqualByComparingTo("0.8");
        assertThat(basis.answers().look()).isEqualTo(CheckIn.Look.BETTER);
        assertThat(basis.answers().recovery()).isEqualTo(CheckIn.Recovery.POOR);
        assertThat(basis.answers().training()).isNull();
        assertThat(basis.answers().waist()).isNull();
        assertThat(basis.answers().appetite()).isNull();
    }

    @Test
    void whereTrainingStandsAndAStateDeclared() {
        StoredSnapshot base = snapshot(TODAY.minusDays(60), weeks("82.0", "81.5", "81.0"));
        StoredSnapshot.Training training = new StoredSnapshot.Training(3, 1, 0, false, true, 0);
        StoredSnapshot read = new StoredSnapshot(base.today(), base.sex(), base.phase(), base.planStart(), base.weights(), new BigDecimal("18"),
                new StoredSnapshot.Energy(2300, null), base.checkIn(), base.profile(), false, base.phaseStart(), training, new BigDecimal("21"),
                false, null, new BigDecimal("17"), DeclaredContext.BUSY);

        DecisionBasis basis = DecisionBasis.of(read, MALE);

        assertThat(basis.training()).isEqualTo(training);
        assertThat(basis.pausedBy()).isEqualTo(DeclaredContext.BUSY);
        // The estimates the engine read stay out (U4): no field carries them, nothing written says "fat".
        assertThat(JsonMapper.builder().build().writeValueAsString(basis).toLowerCase()).doesNotContain("fat").doesNotContain("18");
    }

    @Test
    void aCallWithNoAnswersOrTrainingHasNoneOfThoseRows() {
        DecisionBasis basis = DecisionBasis.of(snapshot(TODAY.minusDays(60), List.of()), MALE);

        assertThat(basis.weeks()).isEmpty();
        assertThat(basis.changeKgPerWeek()).isNull();
        assertThat(basis.adherence()).isNull();
        assertThat(basis.training()).isNull();
        assertThat(basis.pausedBy()).isNull();
    }

    /** Daily weigh-ins over the window's three weeks, oldest week first; null: a week with none. */
    private static List<StoredSnapshot.Weight> weeks(String twoWeeksAgo, String lastWeek, String thisWeek) {
        List<StoredSnapshot.Weight> weights = new ArrayList<>();
        String[] kg = {twoWeeksAgo, lastWeek, thisWeek};
        for (int week = 0; week < 3; week++) {
            if (kg[week] == null) {
                continue;
            }
            LocalDate ends = TODAY.minusDays(7L * (2 - week));
            for (int day = 0; day < 7; day++) {
                weights.add(new StoredSnapshot.Weight(ends.minusDays(day), new BigDecimal(kg[week])));
            }
        }
        return weights;
    }

    private static StoredSnapshot snapshot(LocalDate planStart, List<StoredSnapshot.Weight> weights) {
        return snapshot(planStart, weights, new StoredSnapshot.Answered(CheckIn.Look.UNKNOWN, CheckIn.Training.UNKNOWN, CheckIn.Recovery.UNKNOWN,
                CheckIn.Waist.UNKNOWN, null, CheckIn.Appetite.UNKNOWN));
    }

    private static StoredSnapshot snapshot(LocalDate planStart, List<StoredSnapshot.Weight> weights, StoredSnapshot.Answered answered) {
        return new StoredSnapshot(TODAY, Sex.MALE, Phase.CUT, planStart, weights, null, null, answered, new StoredSnapshot.Body(30, 180), false,
                planStart, null, null, false, null, null, null);
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
