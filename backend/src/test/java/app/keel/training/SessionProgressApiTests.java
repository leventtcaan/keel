package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.engine.ParameterKey;
import app.keel.engine.ParameterSet;
import app.keel.engine.Sex;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * Finishing a workout of a program day sets each planned move's next load and reps (K-217, K-109): every planned set at
 * the top of the range adds the region's load step; unclean form holds them (G6 K-31); a hold of the deload ladder is
 * applied when the program is read (K-110). One day, own program: bench 3 × 6-10, squat 3 × 6-10, bench again
 * 3 × 10-12, one-arm row 3 × 8-12.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class SessionProgressApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    ParameterSet parameters;

    @Autowired
    TrainingCalls calls;

    @Autowired
    TrainingLog log;

    @Autowired
    Clock clock;

    /**
     * A recent session's start: two days before now on the server's clock — before today, and well inside
     * return_step_back_after_weeks (K-531), so no target is stepped back for a break whatever the day the tests run.
     */
    private Instant recently;

    @BeforeEach
    void twoDaysAgo() {
        recently = clock.instant().minus(java.time.Duration.ofDays(2));
    }

    @Test
    void everyPlannedSetAtTheTopAddsTheRegionsStepFromTheBottomOfTheRange() throws Exception {
        AccountId account = withAProgram();
        String workout = start(account, recently);
        sets(account, workout, "bench_press", 3, 60, 10, "BOTH");
        sets(account, workout, "squat", 3, 100, 10, "BOTH");

        assertThat(finish(account, workout, List.of())).hasStatusOk();

        assertThat(next(account, 0)).isEqualTo(target(new BigDecimal("60").add(step(ParameterKey.LOAD_INCREMENT_UPPER_KG)), 6));
        assertThat(next(account, 1)).isEqualTo(target(new BigDecimal("100").add(step(ParameterKey.LOAD_INCREMENT_LOWER_KG)), 6));
    }

    @Test
    void backAfterALongBreakTheTargetIsAStepLighterFromTheBottomOfTheRange() throws Exception {
        // K-531 (ADR-043 #75, G7 K-72): the targets came from a session three weeks and more ago — one of the region's steps
        // under the last load, from the bottom of the range; the program says why.
        AccountId account = withAProgram();
        String workout = start(account, clock.instant().minus(java.time.Duration.ofDays(22)));
        sets(account, workout, "bench_press", 3, 60, 10, "BOTH");
        sets(account, workout, "squat", 3, 100, 10, "BOTH");
        assertThat(finish(account, workout, List.of())).hasStatusOk();

        assertThat(next(account, 0)).isEqualTo(target(new BigDecimal("60").subtract(step(ParameterKey.LOAD_INCREMENT_UPPER_KG)), 6));
        assertThat(next(account, 1)).isEqualTo(target(new BigDecimal("100").subtract(step(ParameterKey.LOAD_INCREMENT_LOWER_KG)), 6));
        assertThat(map(send("GET", account, "/v1/program", null))).containsEntry("backAfterBreak", true);
    }

    @Test
    void aShorterBreakChangesNothing() throws Exception {
        AccountId account = withAProgram();
        String workout = start(account, clock.instant().minus(java.time.Duration.ofDays(19)));
        sets(account, workout, "bench_press", 3, 60, 10, "BOTH");
        assertThat(finish(account, workout, List.of())).hasStatusOk();

        assertThat(next(account, 0)).isEqualTo(target(new BigDecimal("60").add(step(ParameterKey.LOAD_INCREMENT_UPPER_KG)), 6));
        assertThat(map(send("GET", account, "/v1/program", null))).doesNotContainKey("backAfterBreak");
    }

    @Test
    void theStepBackIsALoadTheGymCanMakeAndNoneWhereItMakesNothingLighter() throws Exception {
        // No plate under 5: the bar goes by pairs of 5, so 60 − 2.5 is not on it, and the heaviest under it is 50 (55 would
        // need 17.5 a side). The row's 10 is the rack's lightest — nothing lighter, so the last load stays (from the bottom
        // of the range all the same).
        AccountId account = withAProgram();
        send("PUT", account, "/v1/gyms/" + UUID.randomUUID(), Map.of("name", "Home", "current", true, "barKg", 20,
                "platesKg", List.of(20, 10, 5), "dumbbellsKg", List.of(10, 20), "machines", List.of()));
        String workout = start(account, clock.instant().minus(java.time.Duration.ofDays(30)));
        sets(account, workout, "bench_press", 3, 60, 10, "BOTH");
        sets(account, workout, "one_arm_dumbbell_row", 3, 10, 12, "LEFT");
        sets(account, workout, "one_arm_dumbbell_row", 3, 10, 12, "RIGHT");
        assertThat(finish(account, workout, List.of())).hasStatusOk();

        assertThat(next(account, 0)).isEqualTo(target(50, 6));
        assertThat(next(account, 3)).isEqualTo(target(10, 8));
    }

    @Test
    void aSessionBackEndsTheBreakItsTargetsAreTheUsualOnes() throws Exception {
        AccountId account = withAProgram();
        String before = start(account, clock.instant().minus(java.time.Duration.ofDays(25)));
        sets(account, before, "bench_press", 3, 60, 10, "BOTH");
        assertThat(finish(account, before, List.of())).hasStatusOk();
        String back = start(account, clock.instant().minus(java.time.Duration.ofHours(2)));
        sets(account, back, "bench_press", 3, 57.5, 7, "BOTH");
        assertThat(finish(account, back, List.of())).hasStatusOk();

        assertThat(next(account, 0)).isEqualTo(target(57.5, 8));
        assertThat(map(send("GET", account, "/v1/program", null))).doesNotContainKey("backAfterBreak");
    }

    @Test
    void theProgramCarriesTheInSessionTableAsTheGymMakesIt() throws Exception {
        // K-960 (ADR-075 #3): the phone picks in the gym, offline, from what the server worked out: one load step either way
        // from the target as the gym makes it and never further (the rack has no 18: nothing heavier than 16 within 2.5),
        // the last session's best set, and the load once every set is at the top (16 → 20 is within the jump limit).
        AccountId account = withAProgram();
        send("PUT", account, "/v1/gyms/" + UUID.randomUUID(), Map.of("name", "Home", "current", true, "barKg", 20,
                "platesKg", List.of(20, 10, 5, 2.5, 1.25), "dumbbellsKg", List.of(10, 12, 14, 16, 20), "machines", List.of()));
        String workout = start(account, recently);
        set(account, workout, "bench_press", 60, 8, 1, "BOTH");
        set(account, workout, "bench_press", 60, 8, 0, "BOTH");
        set(account, workout, "bench_press", 60, 7, 0, "BOTH");
        sets(account, workout, "one_arm_dumbbell_row", 3, 16, 9, "LEFT");
        sets(account, workout, "one_arm_dumbbell_row", 3, 16, 9, "RIGHT");
        assertThat(finish(account, workout, List.of())).hasStatusOk();

        Map<String, Object> bench = planned(account, 0);
        assertThat(next(account, 0)).isEqualTo(target(60, 8));
        assertThat(kg(bench.get("lighterLoadKg"))).isEqualByComparingTo("57.5");
        assertThat(kg(bench.get("heavierLoadKg"))).isEqualByComparingTo("62.5");
        assertThat(kg(bench.get("nextLoadAtTopKg"))).isEqualByComparingTo("62.5");
        assertThat((Map<String, Object>) bench.get("lastBestSet")).containsEntry("reps", 8).containsEntry("rir", 0);
        assertThat(kg(((Map<String, Object>) bench.get("lastBestSet")).get("loadKg"))).isEqualByComparingTo("60");

        Map<String, Object> row = planned(account, 3);
        assertThat(kg(row.get("lighterLoadKg"))).isEqualByComparingTo("14");
        assertThat(row).doesNotContainKey("heavierLoadKg");
        assertThat(kg(row.get("nextLoadAtTopKg"))).isEqualByComparingTo("20");

        assertThat(planned(account, 1)).as("squat: no session yet, nothing to start from")
                .doesNotContainKeys("lighterLoadKg", "heavierLoadKg", "lastBestSet", "nextLoadAtTopKg");
        // ADR-075 Ek 1: calibration only where there is no target — the squat's lower-body step, none on the bench.
        assertThat(kg(planned(account, 1).get("calibrationStepKg"))).isEqualByComparingTo(step(ParameterKey.LOAD_INCREMENT_LOWER_KG));
        assertThat(bench).doesNotContainKey("calibrationStepKg");
    }

    @Test
    void theLastSessionIsEachMovesLatestBeforeTodayWithItsWorkingSetsOnly() throws Exception {
        // K-960 review: "Beat last time" is the move's last session, even when an older one was heavier; a warm-up, a drop
        // set and a set to failure are not working sets (SetType); an imported session is seen, not read (K-615, ADR-053).
        AccountId account = withAProgram();
        send("PUT", account, "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA));
        Instant now = Instant.now();
        String older = start(account, now.minus(java.time.Duration.ofDays(6)));
        set(account, older, "bench_press", 80, 8, 1, "BOTH");
        set(account, older, "squat", 100, 6, 1, "BOTH");
        String newer = start(account, now.minus(java.time.Duration.ofDays(4)));
        set(account, newer, "bench_press", 40, 10, null, "BOTH", "WARM_UP");
        set(account, newer, "bench_press", 60, 8, 1, "BOTH");
        set(account, newer, "bench_press", 60, 7, 0, "BOTH");
        set(account, newer, "bench_press", 65, 4, null, "BOTH", "FAILURE");
        set(account, newer, "bench_press", 50, 10, null, "BOTH", "DROP");
        Map<String, Object> importedSet = new HashMap<>(Map.of("exerciseId", "bench_press", "setType", "WORKING", "loadKg", 100, "reps", 5));
        assertThat(send("POST", account, "/v1/workout-imports", Map.of("source", "STRONG", "workouts", List.of(Map.of("clientId", UUID.randomUUID(),
                "startedAt", now.minus(java.time.Duration.ofDays(2)).toString(), "endedAt", now.minus(java.time.Duration.ofDays(2)).plusSeconds(3600).toString(),
                "sets", List.of(importedSet)))))).hasStatusOk();

        Map<String, List<TrainingLog.WorkSet>> last = log.lastSessions(account, now.minus(java.time.Duration.ofDays(1)));

        assertThat(last.get("bench_press")).extracting(set -> set.loadKg().intValue(), TrainingLog.WorkSet::reps)
                .containsExactly(org.assertj.core.groups.Tuple.tuple(60, 8), org.assertj.core.groups.Tuple.tuple(60, 7));
        assertThat(last.get("squat")).as("the squat's last session is the older one").extracting(TrainingLog.WorkSet::reps).containsExactly(6);
        assertThat(log.lastSessions(account, now.minus(java.time.Duration.ofDays(5))).get("bench_press")).as("before the newer session")
                .extracting(set -> set.loadKg().intValue()).containsExactly(80);
    }

    @Test
    void aFirstSessionsCalibratedLoadIsTheTargetAndTheTableStartsFromIt() throws Exception {
        // K-960 (ADR-075 #3, G6 K-40): no target, so the phone offered the heavier load after sets with 2+ reps left (an old
        // 3+ among them). At the finish the load found is the target, and the next session's table starts from it.
        AccountId account = withAProgram();
        String workout = start(account, recently);
        set(account, workout, "bench_press", 40, 10, 3, "BOTH");
        set(account, workout, "bench_press", 40, 10, 2, "BOTH");
        set(account, workout, "bench_press", 42.5, 9, 1, "BOTH");
        set(account, workout, "bench_press", 42.5, 8, 0, "BOTH");
        assertThat(finish(account, workout, List.of())).hasStatusOk();

        Map<String, Object> bench = planned(account, 0);
        assertThat(next(account, 0)).isEqualTo(target(42.5, 9));
        assertThat(kg(bench.get("lighterLoadKg"))).isEqualByComparingTo("40");
        assertThat(kg(bench.get("heavierLoadKg"))).isEqualByComparingTo("45");
        assertThat((Map<String, Object>) bench.get("lastBestSet")).containsEntry("reps", 9).containsEntry("rir", 1);
    }

    @Test
    void aSessionOfAnyKindSinceEndsTheBreakTheAccountsNotADays() throws Exception {
        // ADR-043 #75: the break is the training log's. A session two days ago with no program day (or another day of the
        // program) was training: the day's three-week-old targets are not stepped back, and nothing says "back after a break".
        AccountId account = withAProgram();
        String old = start(account, clock.instant().minus(java.time.Duration.ofDays(22)));
        sets(account, old, "bench_press", 3, 60, 10, "BOTH");
        assertThat(finish(account, old, List.of())).hasStatusOk();
        MvcTestResult free = send("POST", account, "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt",
                clock.instant().minus(java.time.Duration.ofDays(2)).toString()));
        assertThat(free).hasStatus(201);
        set(account, (String) map(free).get("id"), "squat", 100, 8, 1, "BOTH");

        assertThat(next(account, 0)).isEqualTo(target(new BigDecimal("60").add(step(ParameterKey.LOAD_INCREMENT_UPPER_KG)), 6));
        assertThat(map(send("GET", account, "/v1/program", null))).doesNotContainKey("backAfterBreak");
    }

    @Test
    void anImportedSessionDoesNotEndTheBreak() throws Exception {
        // ADR-053: a session imported from another app's export is seen, never read — two days ago in Strong is not the
        // training log the break is measured from, so the three-week-old targets are still stepped back.
        AccountId account = withAProgram();
        send("PUT", account, "/v1/consents/HEALTH_DATA", Map.of("textVersion", app.keel.consent.ConsentTextVersions.HEALTH_DATA));
        String old = start(account, clock.instant().minus(java.time.Duration.ofDays(22)));
        sets(account, old, "bench_press", 3, 60, 10, "BOTH");
        assertThat(finish(account, old, List.of())).hasStatusOk();
        Instant twoDaysAgo = clock.instant().minus(java.time.Duration.ofDays(2));
        assertThat(send("POST", account, "/v1/workout-imports", Map.of("source", "STRONG", "workouts", List.of(Map.of("clientId", UUID.randomUUID(),
                "startedAt", twoDaysAgo.toString(), "endedAt", twoDaysAgo.plusSeconds(3600).toString(),
                "sets", List.of(Map.of("exerciseId", "bench_press", "setType", "WORKING", "loadKg", 62.5, "reps", 10)))))))
                .hasStatusOk();

        assertThat(next(account, 0)).isEqualTo(target(new BigDecimal("60").subtract(step(ParameterKey.LOAD_INCREMENT_UPPER_KG)), 6));
        assertThat(map(send("GET", account, "/v1/program", null))).containsEntry("backAfterBreak", true);
    }

    @Test
    void aMachineTheGymSaysNothingAboutStepsBackByTheEnginesNumber() throws Exception {
        // The gym has plates but no stack step: it says nothing of a machine's loads — the engine's step, not the last load.
        AccountId account = TestSessions.newAccount();
        send("PUT", account, "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")));
        assertThat(send("PUT", account, "/v1/program", Map.of("days", List.of(Map.of("name", "Upper", "weekday", "MONDAY", "exercises",
                List.of(own("machine_chest_press", 8, 12))))))).hasStatusOk();
        send("PUT", account, "/v1/gyms/" + UUID.randomUUID(), Map.of("name", "Home", "current", true, "barKg", 20,
                "platesKg", List.of(20, 10, 5), "dumbbellsKg", List.of(), "machines", List.of()));
        String workout = start(account, clock.instant().minus(java.time.Duration.ofDays(25)));
        sets(account, workout, "machine_chest_press", 3, 50, 10, "BOTH");
        assertThat(finish(account, workout, List.of())).hasStatusOk();

        assertThat(next(account, 0)).isEqualTo(target(new BigDecimal("50").subtract(step(ParameterKey.LOAD_INCREMENT_UPPER_KG)), 8));
    }

    @Test
    void theAddedLoadIsWhatTheGymInUseCanMake() throws Exception {
        // K-414: plates by 2.5 make +5 on the bar; dumbbells by 2 make 22 of 20 + 2.5; at the rack's heaviest, one more rep.
        AccountId account = withAProgram();
        send("PUT", account, "/v1/gyms/" + UUID.randomUUID(), Map.of("name", "Downtown", "current", true, "barKg", 20,
                "platesKg", List.of(20, 10, 5, 2.5), "dumbbellsKg", List.of(18, 20, 22, 24), "machines", List.of()));
        // The week before, then this week: both in the past, as a finish cannot end before its start (endedAt is now).
        String workout = start(account, recently.minus(java.time.Duration.ofDays(7)));
        sets(account, workout, "bench_press", 3, 60, 10, "BOTH");
        sets(account, workout, "one_arm_dumbbell_row", 3, 20, 12, "LEFT");
        sets(account, workout, "one_arm_dumbbell_row", 3, 20, 12, "RIGHT");

        assertThat(finish(account, workout, List.of())).hasStatusOk();

        assertThat(next(account, 0)).isEqualTo(target(65, 6));
        assertThat(next(account, 3)).isEqualTo(target(22, 8));
        send("PUT", account, "/v1/gyms/" + UUID.randomUUID(), Map.of("name", "Home", "current", true, "platesKg", List.of(),
                "dumbbellsKg", List.of(10, 20), "machines", List.of()));
        String nextWeek = start(account, recently);
        sets(account, nextWeek, "one_arm_dumbbell_row", 3, 20, 12, "LEFT");
        sets(account, nextWeek, "one_arm_dumbbell_row", 3, 20, 12, "RIGHT");
        assertThat(finish(account, nextWeek, List.of())).hasStatusOk();
        assertThat(next(account, 3)).isEqualTo(target(20, 13));
    }

    @Test
    void aRackWhoseNextDumbbellIsTooFarKeepsTheLoadAndAddsARep() throws Exception {
        // K-430 (ADR-037 #38): 10 kg then 20 is four of the engine's 2.5 kg steps, past load_jump_max_steps (2): the load
        // stays and the reps go one past the weakest set, as when nothing heavier is in the gym.
        AccountId account = withAProgram();
        send("PUT", account, "/v1/gyms/" + UUID.randomUUID(), Map.of("name", "Home", "current", true, "platesKg", List.of(),
                "dumbbellsKg", List.of(10, 20), "machines", List.of()));
        String workout = start(account, recently);
        sets(account, workout, "one_arm_dumbbell_row", 3, 10, 12, "LEFT");
        sets(account, workout, "one_arm_dumbbell_row", 3, 10, 12, "RIGHT");

        assertThat(finish(account, workout, List.of())).hasStatusOk();

        assertThat(next(account, 3)).isEqualTo(target(10, 13));
        assertThat(planned(account, 3)).as("below the ceiling, no word of the rack (K-534)").doesNotContainKey("rackEnds");
    }

    @Test
    void onASparseRackTheRepsStopAtTheCeilingAndTheProgramSaysTheRackEnds() throws Exception {
        // K-534 (ADR-045 #73): 10 kg then 20 — at the range's top + rep_ceiling_above_range the target stays, and says why.
        AccountId account = withAProgram();
        int ceiling = 12 + parameters.forSex(Sex.MALE).wholeNumber(ParameterKey.REP_CEILING_ABOVE_RANGE);
        send("PUT", account, "/v1/gyms/" + UUID.randomUUID(), Map.of("name", "Home", "current", true, "platesKg", List.of(),
                "dumbbellsKg", List.of(10, 20), "machines", List.of()));
        String workout = start(account, recently);
        sets(account, workout, "one_arm_dumbbell_row", 3, 10, ceiling, "LEFT");
        sets(account, workout, "one_arm_dumbbell_row", 3, 10, ceiling, "RIGHT");

        assertThat(finish(account, workout, List.of())).hasStatusOk();

        assertThat(next(account, 3)).isEqualTo(target(10, ceiling));
        assertThat(planned(account, 3)).containsEntry("rackEnds", true);
    }

    @Test
    void manyRepsHeldForFormAreNotTheRackEnding() throws Exception {
        // K-534 review: unclean form holds the session at any rep count (G6 K-31) — past the ceiling, with a 12 kg pair in
        // the gym. The rack did not end: no word of it.
        AccountId account = withAProgram();
        int past = 12 + parameters.forSex(Sex.MALE).wholeNumber(ParameterKey.REP_CEILING_ABOVE_RANGE) + 1;
        send("PUT", account, "/v1/gyms/" + UUID.randomUUID(), Map.of("name", "Home", "current", true, "platesKg", List.of(),
                "dumbbellsKg", List.of(10, 12, 14), "machines", List.of()));
        String workout = start(account, recently);
        sets(account, workout, "one_arm_dumbbell_row", 3, 10, past, "LEFT");
        sets(account, workout, "one_arm_dumbbell_row", 3, 10, past, "RIGHT");

        assertThat(finish(account, workout, List.of("one_arm_dumbbell_row"))).hasStatusOk();

        assertThat(next(account, 3)).isEqualTo(target(10, past));
        assertThat(planned(account, 3)).doesNotContainKey("rackEnds");
    }

    @Test
    void aBodyweightMovesAddedLoadHasNoJumpLimitTheBodyIsPartOfTheLoad() throws Exception {
        // K-430 review: +10 → +20 kg on a pull-up is four of the engine's steps, but the body moves too — about 90 → 100 kg
        // for an 80 kg lifter, not a doubling. The limit is for a load all on the equipment; here the nearest is taken.
        AccountId account = withAProgram();
        assertThat(send("PUT", account, "/v1/program", Map.of("days", List.of(Map.of("name", "Pull", "weekday", "MONDAY", "exercises",
                List.of(own("pull_up", 8, 12))))))).hasStatusOk();
        send("PUT", account, "/v1/gyms/" + UUID.randomUUID(), Map.of("name", "Downtown", "current", true, "platesKg", List.of(10),
                "dumbbellsKg", List.of(), "machines", List.of()));
        String workout = start(account, recently);
        sets(account, workout, "pull_up", 3, 10, 12, "BOTH");

        assertThat(finish(account, workout, List.of())).hasStatusOk();

        assertThat(next(account, 0)).isEqualTo(target(20, 8));
    }

    @Test
    void aMachinesOwnStepIsTheOneTheLoadIsRoundedTo() throws Exception {
        // The move's own machine in the gym's list (by the move's id), not the gym's stack step: 35 + 2.5 is 42 by 7s, 40 by 5s.
        AccountId account = withAProgram();
        assertThat(send("PUT", account, "/v1/program", Map.of("days", List.of(Map.of("name", "Pull", "weekday", "MONDAY", "exercises",
                List.of(own("lat_pulldown", 8, 12))))))).hasStatusOk();
        send("PUT", account, "/v1/gyms/" + UUID.randomUUID(), Map.of("name", "Downtown", "current", true, "platesKg", List.of(),
                "dumbbellsKg", List.of(), "stackStepKg", 5, "machines", List.of(Map.of("exerciseId", "lat_pulldown", "stepKg", 7))));
        String workout = start(account, recently);
        sets(account, workout, "lat_pulldown", 3, 35, 12, "BOTH");

        assertThat(finish(account, workout, List.of())).hasStatusOk();

        // 42 is 7 over 35, past load_jump_max_steps (2) of the engine's 2.5 (K-430): 35 × 12 at RIR 1 is worth 5 to failure
        // at 42 (Epley), short of 8 at the planned RIR 1, so
        // the load stays and the reps go up (ADR-041 #55: 42 × 8 → 35 × 13, K1 approved).
        assertThat(next(account, 0)).isEqualTo(target(35, 13));
    }

    @Test
    void aMachineLoadTooFarIsTakenOnceTheSetsAtTheLastAreWorthTheBottomOfTheRangeThere() throws Exception {
        // K-430 (ADR-041 #55): 35 × 16 at RIR 1 is worth 9 to failure at 42 (Epley) — 8 at the planned RIR 1, the bottom of
        // 8-12 — so the jump, from the bottom.
        AccountId account = withAProgram();
        assertThat(send("PUT", account, "/v1/program", Map.of("days", List.of(Map.of("name", "Pull", "weekday", "MONDAY", "exercises",
                List.of(own("lat_pulldown", 8, 12))))))).hasStatusOk();
        send("PUT", account, "/v1/gyms/" + UUID.randomUUID(), Map.of("name", "Downtown", "current", true, "platesKg", List.of(),
                "dumbbellsKg", List.of(), "stackStepKg", 5, "machines", List.of(Map.of("exerciseId", "lat_pulldown", "stepKg", 7))));
        String workout = start(account, recently);
        sets(account, workout, "lat_pulldown", 3, 35, 16, "BOTH");

        assertThat(finish(account, workout, List.of())).hasStatusOk();

        assertThat(next(account, 0)).isEqualTo(target(42, 8));
    }

    @Test
    void addingRepsReadsTheSetsBackAndAnUnsetRirIsThePlannedOne() throws Exception {
        AccountId account = withAProgram();
        String workout = start(account, recently);
        set(account, workout, "bench_press", 60, 8, 1, "BOTH");
        set(account, workout, "bench_press", 60, 9, null, "BOTH");
        set(account, workout, "bench_press", 60, 9, 1, "BOTH");

        finish(account, workout, List.of());

        assertThat(next(account, 0)).isEqualTo(target(60, 9));
    }

    @Test
    void aLighterLastSetOrAWarmUpAtTheTopDoesNotCountAsAPlannedSet() throws Exception {
        // Two at 60 × 10 and the third at 57.5: not every planned set at the top — the load is repeated at the top.
        AccountId account = withAProgram();
        String workout = start(account, recently);
        set(account, workout, "bench_press", 60, 3, null, "BOTH", "WARM_UP");
        sets(account, workout, "bench_press", 2, 60, 10, "BOTH");
        set(account, workout, "bench_press", 57.5, 10, 1, "BOTH");

        finish(account, workout, List.of());

        assertThat(next(account, 0)).isEqualTo(target(60, 10));
    }

    @Test
    void uncleanFormHoldsTheLoadAndTheReps() throws Exception {
        AccountId account = withAProgram();
        String workout = start(account, recently);
        sets(account, workout, "bench_press", 3, 60, 10, "BOTH");

        assertThat(finish(account, workout, List.of("bench_press"))).hasStatusOk();

        assertThat(next(account, 0)).isEqualTo(target(60, 10));
    }

    @Test
    void aHoldBegunAfterTheWorkoutStillHoldsTheNextSession() throws Exception {
        // A workout three days ago added load; yesterday's check-in holds it (K-110): the program shows the last load at the top.
        AccountId account = withAProgram();
        String workout = start(account, recently.minusSeconds(86_400));
        sets(account, workout, "bench_press", 3, 60, 10, "BOTH");
        finish(account, workout, List.of());
        assertThat(next(account, 0).getFirst()).isEqualTo(kg(new BigDecimal("60").add(step(ParameterKey.LOAD_INCREMENT_UPPER_KG))));

        calls.holdLoad(account, UUID.randomUUID(), LocalDate.now(clock).minusDays(1));

        assertThat(next(account, 0)).isEqualTo(target(60, 10));
    }

    @Test
    void theSameMoveTwiceInADayKeepsATargetEach() throws Exception {
        // 3 × 100 × 10 on bench: the 6-10 row adds load; the 10-12 row (the same sets, at its bottom) adds a rep.
        AccountId account = withAProgram();
        String workout = start(account, recently);
        sets(account, workout, "bench_press", 3, 100, 10, "BOTH");

        finish(account, workout, List.of());

        assertThat(next(account, 0)).isEqualTo(target(new BigDecimal("100").add(step(ParameterKey.LOAD_INCREMENT_UPPER_KG)), 6));
        assertThat(next(account, 2)).isEqualTo(target(100, 11));
    }

    @Test
    void aOneSidedMoveFollowsItsWeakerSide() throws Exception {
        // Left 3 × 20 × 12 (top), right 3 × 17.5 × 10: the right arm decides — 17.5 for 11, not 22.5 for both.
        AccountId account = withAProgram();
        String workout = start(account, recently);
        sets(account, workout, "one_arm_dumbbell_row", 3, 20, 12, "LEFT");
        sets(account, workout, "one_arm_dumbbell_row", 3, 17.5, 10, "RIGHT");

        finish(account, workout, List.of());

        assertThat(next(account, 3)).isEqualTo(target(17.5, 11));
    }

    @Test
    void anOlderWorkoutFinishedLateDoesNotRollTheTargetBack() throws Exception {
        AccountId account = withAProgram();
        String older = start(account, recently.minusSeconds(7 * 86_400));
        sets(account, older, "bench_press", 3, 55, 10, "BOTH");
        String newer = start(account, recently);
        sets(account, newer, "bench_press", 3, 60, 10, "BOTH");
        finish(account, newer, List.of());

        finish(account, older, List.of());

        assertThat(next(account, 0).getFirst()).isEqualTo(kg(new BigDecimal("60").add(step(ParameterKey.LOAD_INCREMENT_UPPER_KG))));
    }

    @Test
    void aRefusedFinishChangesNothing() throws Exception {
        AccountId account = withAProgram();
        String workout = start(account, recently);
        sets(account, workout, "bench_press", 3, 60, 10, "BOTH");

        assertThat(finish(account, workout, List.of("no_such_move"))).hasStatus(400);
        assertThat(finish(account, workout, List.of("bench_press", "bench_press"))).hasStatus(400);
        assertThat(finish(account, workout, java.util.Arrays.asList((String) null))).as("a null in the answer").hasStatus(400);

        assertThat(map(send("GET", account, "/v1/workouts/" + workout, null))).doesNotContainKey("endedAt");
        assertThat(planned(account, 0)).doesNotContainKeys("nextLoadKg", "nextReps");
    }

    @Test
    void aSetDeletedFromTheLastFinishedSessionTakesTheTargetFromWhatIsLeft() throws Exception {
        // K-432 (ADR-037 #48): a set logged by mistake and deleted is data corrected (U2); the target is derived again —
        // two of three planned sets at the top repeat the load at the top of the range.
        AccountId account = withAProgram();
        String workout = start(account, recently);
        sets(account, workout, "bench_press", 3, 60, 10, "BOTH");
        assertThat(finish(account, workout, List.of())).hasStatusOk();
        assertThat(next(account, 0)).isEqualTo(target(new BigDecimal("60").add(step(ParameterKey.LOAD_INCREMENT_UPPER_KG)), 6));

        assertThat(send("DELETE", account, "/v1/workouts/" + workout + "/sets/" + setIds(account, workout).getFirst(), null)).hasStatus(204);

        assertThat(next(account, 0)).isEqualTo(target(60, 10));
    }

    @Test
    void aForgottenSetAddedToTheLastFinishedSessionCountsForTheTarget() throws Exception {
        AccountId account = withAProgram();
        String workout = start(account, recently);
        sets(account, workout, "bench_press", 2, 60, 10, "BOTH");
        assertThat(finish(account, workout, List.of())).hasStatusOk();
        assertThat(next(account, 0)).isEqualTo(target(60, 10));

        set(account, workout, "bench_press", 60, 10, 1, "BOTH");

        assertThat(next(account, 0)).isEqualTo(target(new BigDecimal("60").add(step(ParameterKey.LOAD_INCREMENT_UPPER_KG)), 6));
    }

    @Test
    void everySetOfAMoveDeletedFromTheSessionItsTargetCameFromLeavesNoTarget() throws Exception {
        // The target came from sets that are gone: none is left standing on deleted data.
        AccountId account = withAProgram();
        String workout = start(account, recently);
        sets(account, workout, "bench_press", 3, 60, 10, "BOTH");
        sets(account, workout, "squat", 3, 100, 10, "BOTH");
        assertThat(finish(account, workout, List.of())).hasStatusOk();

        for (String set : setIds(account, workout).subList(0, 3)) {
            assertThat(send("DELETE", account, "/v1/workouts/" + workout + "/sets/" + set, null)).hasStatus(204);
        }

        assertThat(planned(account, 0)).doesNotContainKeys("nextLoadKg", "nextReps");
        assertThat(next(account, 1)).isEqualTo(target(new BigDecimal("100").add(step(ParameterKey.LOAD_INCREMENT_LOWER_KG)), 6));
    }

    @Test
    void editingAnOlderSessionLeavesTheTargetTheNewerOneSet() throws Exception {
        AccountId account = withAProgram();
        String older = start(account, recently.minus(java.time.Duration.ofDays(7)));
        sets(account, older, "bench_press", 3, 60, 10, "BOTH");
        assertThat(finish(account, older, List.of())).hasStatusOk();
        String newer = start(account, recently);
        sets(account, newer, "bench_press", 2, 62.5, 8, "BOTH");
        assertThat(finish(account, newer, List.of())).hasStatusOk();
        List<Object> set = next(account, 0);

        assertThat(send("DELETE", account, "/v1/workouts/" + older + "/sets/" + setIds(account, older).getFirst(), null)).hasStatus(204);
        set(account, older, "bench_press", 70, 12, 1, "BOTH");

        assertThat(next(account, 0)).isEqualTo(set);
    }

    @Test
    void aMoveWhoseFormWasNotCleanStaysHeldWhenItsSessionIsEdited() throws Exception {
        // The finish's answer is kept with the workout (G6 K-31): derived again, the held move is still held.
        AccountId account = withAProgram();
        String workout = start(account, recently);
        sets(account, workout, "bench_press", 3, 60, 10, "BOTH");
        sets(account, workout, "squat", 3, 100, 10, "BOTH");
        assertThat(finish(account, workout, List.of("bench_press"))).hasStatusOk();
        List<Object> held = next(account, 0);

        assertThat(send("DELETE", account, "/v1/workouts/" + workout + "/sets/" + setIds(account, workout).getLast(), null)).hasStatus(204);

        assertThat(next(account, 0)).isEqualTo(held);
        assertThat(next(account, 1)).as("squat, two of three sets left").isEqualTo(target(100, 10));
    }

    @Test
    void aSessionSaysWhetherItsEditsMoveTheTargets() throws Exception {
        AccountId account = withAProgram();
        String older = start(account, recently.minus(java.time.Duration.ofDays(7)));
        sets(account, older, "bench_press", 3, 60, 10, "BOTH");
        assertThat(finish(account, older, List.of())).hasStatusOk();
        // The newer session sets every move's target: none is left for an edit of the older one to move.
        String newer = start(account, recently);
        sets(account, newer, "bench_press", 3, 60, 10, "BOTH");
        sets(account, newer, "squat", 3, 100, 10, "BOTH");
        sets(account, newer, "one_arm_dumbbell_row", 3, 20, 10, "LEFT");
        sets(account, newer, "one_arm_dumbbell_row", 3, 20, 10, "RIGHT");
        assertThat(finish(account, newer, List.of())).hasStatusOk();
        String unfinished = start(account, recently.plus(java.time.Duration.ofHours(1)));

        assertThat(map(send("GET", account, "/v1/workouts/" + newer, null))).containsEntry("setsNextTargets", true);
        assertThat(map(send("GET", account, "/v1/workouts/" + older, null))).containsEntry("setsNextTargets", false);
        assertThat(map(send("GET", account, "/v1/workouts/" + unfinished, null))).doesNotContainKey("setsNextTargets");
    }

    @Test
    void anOlderSessionStillATargetsSourceMovesItWhenEdited() throws Exception {
        // Per move (K-432 review): the newer session has no bench, so bench's target is still the older session's —
        // correcting that session's bench corrects the target; squat's came from the newer one and stays.
        AccountId account = withAProgram();
        String older = start(account, recently.minus(java.time.Duration.ofDays(7)));
        sets(account, older, "bench_press", 3, 60, 10, "BOTH");
        assertThat(finish(account, older, List.of())).hasStatusOk();
        String newer = start(account, recently);
        sets(account, newer, "squat", 3, 100, 10, "BOTH");
        assertThat(finish(account, newer, List.of())).hasStatusOk();
        List<Object> squat = next(account, 1);

        assertThat(map(send("GET", account, "/v1/workouts/" + older, null))).containsEntry("setsNextTargets", true);
        assertThat(send("DELETE", account, "/v1/workouts/" + older + "/sets/" + setIds(account, older).getFirst(), null)).hasStatus(204);

        assertThat(next(account, 0)).isEqualTo(target(60, 10));
        assertThat(next(account, 1)).isEqualTo(squat);
    }

    @Test
    void aSessionWhoseMoveHasNoTargetYetSetsOneWhenTheMoveIsAdded() throws Exception {
        // The forgotten bench of the last session: no target came from it, yet adding the sets makes one — so it says so.
        AccountId account = withAProgram();
        String workout = start(account, recently);
        sets(account, workout, "squat", 3, 100, 10, "BOTH");
        assertThat(finish(account, workout, List.of())).hasStatusOk();
        assertThat(map(send("GET", account, "/v1/workouts/" + workout, null))).containsEntry("setsNextTargets", true);

        sets(account, workout, "bench_press", 3, 60, 10, "BOTH");

        assertThat(next(account, 0)).isEqualTo(target(new BigDecimal("60").add(step(ParameterKey.LOAD_INCREMENT_UPPER_KG)), 6));
    }

    @Test
    void theListSaysItForEachSession() throws Exception {
        AccountId account = withAProgram();
        String older = start(account, recently.minus(java.time.Duration.ofDays(7)));
        sets(account, older, "bench_press", 3, 60, 10, "BOTH");
        assertThat(finish(account, older, List.of())).hasStatusOk();
        String newer = start(account, recently);
        for (String move : List.of("bench_press", "squat", "one_arm_dumbbell_row")) {
            sets(account, newer, move, 3, 20, 10, "one_arm_dumbbell_row".equals(move) ? "LEFT" : "BOTH");
        }
        set(account, newer, "one_arm_dumbbell_row", 20, 10, 1, "RIGHT");
        set(account, newer, "one_arm_dumbbell_row", 20, 10, 1, "RIGHT");
        set(account, newer, "one_arm_dumbbell_row", 20, 10, 1, "RIGHT");
        assertThat(finish(account, newer, List.of())).hasStatusOk();

        Map<String, Object> listed = ((List<Map<String, Object>>) JSON.readValue(send("GET", account,
                "/v1/workouts?from=" + LocalDate.ofInstant(recently.minus(java.time.Duration.ofDays(7)), ZoneOffset.UTC) + "&to="
                + LocalDate.ofInstant(recently, ZoneOffset.UTC), null).getResponse().getContentAsString(), List.class)).stream()
                .collect(java.util.stream.Collectors.toMap(w -> (String) w.get("id"), w -> w.get("setsNextTargets")));

        assertThat(listed).containsEntry(newer, true).containsEntry(older, false);
    }

    @SuppressWarnings("unchecked")
    private List<String> setIds(AccountId account, String workout) throws Exception {
        return ((List<Map<String, Object>>) map(send("GET", account, "/v1/workouts/" + workout, null)).get("sets")).stream()
                .map(set -> (String) set.get("id")).toList();
    }

    private AccountId withAProgram() {
        AccountId account = TestSessions.newAccount();
        send("PUT", account, "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC")));
        assertThat(send("PUT", account, "/v1/program", Map.of("days", List.of(Map.of("name", "Full body", "weekday", "MONDAY", "exercises", List.of(
                own("bench_press", 6, 10), own("squat", 6, 10), own("bench_press", 10, 12), own("one_arm_dumbbell_row", 8, 12))))))).hasStatusOk();
        return account;
    }

    private static Map<String, Object> own(String exercise, int min, int max) {
        return Map.of("exerciseId", exercise, "sets", 3, "reps", Map.of("min", min, "max", max));
    }

    private String start(AccountId account, Instant at) throws Exception {
        Map<String, Object> day = ((List<Map<String, Object>>) map(send("GET", account, "/v1/program", null)).get("days")).getFirst();
        MvcTestResult started = send("POST", account, "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", at.toString(),
                "programDayId", day.get("id")));
        assertThat(started).hasStatus(201);
        return (String) map(started).get("id");
    }

    private void sets(AccountId account, String workout, String exercise, int count, double kg, int reps, String side) {
        for (int i = 0; i < count; i++) {
            set(account, workout, exercise, kg, reps, 1, side);
        }
    }

    private void set(AccountId account, String workout, String exercise, double kg, int reps, Integer rir, String side) {
        set(account, workout, exercise, kg, reps, rir, side, "WORKING");
    }

    private void set(AccountId account, String workout, String exercise, double kg, int reps, Integer rir, String side, String type) {
        Map<String, Object> body = new HashMap<>(Map.of("clientId", UUID.randomUUID(), "exerciseId", exercise, "setType", type, "loadKg", kg,
                "reps", reps, "side", side));
        if (rir != null) {
            body.put("rir", rir);
        }
        assertThat(send("POST", account, "/v1/workouts/" + workout + "/sets", body)).hasStatus(201);
    }

    private MvcTestResult finish(AccountId account, String workout, List<String> unclean) {
        return send("POST", account, "/v1/workouts/" + workout + "/finish",
                Map.of("endedAt", clock.instant().toString(), "uncleanExerciseIds", unclean));
    }

    /** The day's planned move at this position, as the program shows it today. */
    private Map<String, Object> planned(AccountId account, int position) throws Exception {
        Map<String, Object> day = ((List<Map<String, Object>>) map(send("GET", account, "/v1/program", null)).get("days")).getFirst();
        return ((List<Map<String, Object>>) day.get("exercises")).get(position);
    }

    /** The load step of the region, from the parameter file. */
    private BigDecimal step(ParameterKey key) {
        return BigDecimal.valueOf(parameters.forSex(Sex.MALE).number(key));
    }

    /** The planned move's next load (plain, 62.5 not 62.50) and reps. */
    private List<Object> next(AccountId account, int position) throws Exception {
        Map<String, Object> planned = planned(account, position);
        return List.of(kg(planned.get("nextLoadKg")), planned.get("nextReps"));
    }

    private static List<Object> target(Object kg, int reps) {
        return List.of(kg(kg), reps);
    }

    private static BigDecimal kg(Object kg) {
        return new BigDecimal(kg.toString()).stripTrailingZeros();
    }

    private MvcTestResult send(String method, AccountId account, String uri, Object body) {
        var request = switch (method) {
            case "GET" -> mvc.get();
            case "PUT" -> mvc.put();
            case "DELETE" -> mvc.delete();
            default -> mvc.post();
        };
        request = request.uri(uri).header("Authorization", TestSessions.bearer(context, account));
        if (body != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(body));
        }
        return request.exchange();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(MvcTestResult result) throws Exception {
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }
}
