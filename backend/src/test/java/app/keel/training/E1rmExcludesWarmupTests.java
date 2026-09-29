package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.E1rm;
import app.keel.engine.ParameterSet;
import app.keel.engine.Parameters;
import app.keel.engine.Sex;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import tools.jackson.databind.json.JsonMapper;

/**
 * Only working sets feed effort and the estimated one-rep max (K-218, L3 P6): the log hands the engine the working sets
 * of a move, and a bodyweight move's load is bodyweight plus what was added.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class E1rmExcludesWarmupTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final Instant FROM = Instant.parse("2026-09-01T00:00:00Z");
    private static final Instant TO = Instant.parse("2026-10-01T00:00:00Z");

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    TrainingLog log;

    @Autowired
    ParameterSet parameters;

    @Test
    void theBestEstimateComesFromWorkingSetsOnly() throws Exception {
        AccountId account = TestSessions.newAccount();
        String workout = start(account);
        logSet(account, workout, "bench_press", "WARM_UP", 70, 10, 0);   // alone: 93.3
        logSet(account, workout, "bench_press", "WORKING", 80, 5, 1);    // 80 × (1 + 6/30) = 96.0
        logSet(account, workout, "bench_press", "DROP", 75, 9, 1);       // alone: 100.0 — tired, lighter, not the best effort
        logSet(account, workout, "squat", "WORKING", 120, 5, 1);         // another move

        List<TrainingLog.WorkSet> sets = log.workingSets(account, "bench_press", FROM, TO);

        assertThat(sets).extracting(TrainingLog.WorkSet::loadKg).containsExactly(new BigDecimal("80"));
        assertThat(best(sets, Optional.empty())).contains(new BigDecimal("96.0"));
    }

    @Test
    void aBodyweightMovesLoadIsBodyweightPlusWhatWasAdded() throws Exception {
        AccountId account = TestSessions.newAccount();
        logSet(account, start(account), "pull_up", "WORKING", 10, 8, 1);

        List<TrainingLog.WorkSet> sets = log.workingSets(account, "pull_up", FROM, TO);

        // (80 + 10) × (1 + 9/30) = 117.0; without a known bodyweight, no estimate rather than one on 10 kg.
        assertThat(best(sets, Optional.of(new BigDecimal("80")))).contains(new BigDecimal("117.0"));
        assertThat(best(sets, Optional.empty())).isEmpty();
    }

    @Test
    void anExternalLoadIsTheLoad() {
        TrainingLog.WorkSet bench = new TrainingLog.WorkSet("bench_press", FROM, ExerciseCatalog.Load.EXTERNAL, new BigDecimal("80"), 5, 1, null);

        assertThat(bench.effectiveLoadKg(Optional.of(new BigDecimal("75")))).contains(new BigDecimal("80"));
    }

    private Optional<BigDecimal> best(List<TrainingLog.WorkSet> sets, Optional<BigDecimal> bodyWeightKg) {
        Parameters p = parameters.forSex(Sex.MALE);
        return sets.stream().flatMap(set -> set.effectiveLoadKg(bodyWeightKg).flatMap(load -> E1rm.estimate(load, set.reps(), set.rir(), p)).stream())
                .max(Comparator.naturalOrder());
    }

    private String start(AccountId account) throws Exception {
        return (String) JSON.readValue(post(account, "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", "2026-09-30T15:40:00Z")),
                Map.class).get("id");
    }

    private void logSet(AccountId account, String workout, String exercise, String type, double loadKg, int reps, int rir) throws Exception {
        post(account, "/v1/workouts/" + workout + "/sets", Map.of("clientId", UUID.randomUUID(), "exerciseId", exercise, "setType", type,
                "loadKg", loadKg, "reps", reps, "rir", rir));
    }

    private String post(AccountId account, String uri, Object body) throws Exception {
        var result = mvc.post().uri(uri).header("Authorization", TestSessions.bearer(context, account)).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(body)).exchange();
        assertThat(result.getResponse().getStatus()).as(uri).isLessThan(300);
        return result.getResponse().getContentAsString();
    }
}
