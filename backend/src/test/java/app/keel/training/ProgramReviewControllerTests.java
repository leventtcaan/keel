package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import app.keel.engine.RepositoryParameters;
import app.keel.engine.Sex;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * The program review's endpoints (K-956, ADR-073 #2-#4, contract /v1/program/review): the suggestions and the changes in
 * force; the picks applied, each a change of the log, the program keeping its source, its rows and their targets; a stale
 * review refused; any change undone, the later ones applied again; the review run again on every program the server
 * answers. The user's own week: chest over weekly_sets_max (16), hamstrings under weekly_sets_min (2), a squat at 3-5.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class ProgramReviewControllerTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static final List<String> FINDINGS = List.of("TOO_MANY_SETS:chest", "TOO_FEW_SETS:hamstrings", "REP_RANGE:squat");

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    JdbcClient jdbc;

    // ── the review ───────────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void theReviewIsTheSuggestionsInPriorityOrderAndRidesOnTheProgram() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> entered = map(send("PUT", account, "/v1/program", ownWeek(16)));

        MvcTestResult review = send("GET", account, "/v1/program/review", null);

        assertThat(review).hasStatusOk();
        assertThat(map(review)).isEqualTo(entered.get("review"));
        assertThat(suggestions(entered)).isEqualTo(FINDINGS);
        assertThat(review).bodyJson().extractingPath("$.applied").asArray().isEmpty();
        assertThat(review).bodyJson().extractingPath("$.suggestions[0]").asMap().containsEntry("finding", "TOO_MANY_SETS")
                .containsEntry("muscle", "chest").containsEntry("copyKey", "review.too_many_sets")
                .containsEntry("reason", Map.of("rule", "program_weekly_sets_max", "source", Map.of("tag", "EXPERIENCE")))
                .containsEntry("numbers", Map.of("from", 16, "to", P.wholeNumber(ParameterKey.WEEKLY_SETS_TRIM_TO)));
    }

    @Test
    void theReviewRunsAgainWhenTheProgramChanges() throws Exception {
        // Moves changed (chest within weekly_sets_max) and the split changed (a generated program in its place).
        AccountId account = TestSessions.newAccount();
        Map<String, Object> first = map(send("PUT", account, "/v1/program", ownWeek(16)));

        Map<String, Object> edited = map(send("PUT", account, "/v1/program", ownWeek(P.wholeNumber(ParameterKey.WEEKLY_SETS_MAX))));
        Map<String, Object> rebuilt = map(send("POST", account, "/v1/program/generate", Map.of("trainingDays", List.of("MONDAY", "WEDNESDAY", "FRIDAY"))));

        assertThat(suggestions(edited)).doesNotContain("TOO_MANY_SETS:chest").contains("TOO_FEW_SETS:hamstrings");
        assertThat(reviewId(edited)).isNotEqualTo(reviewId(first));
        assertThat(reviewId(rebuilt)).isNotEqualTo(reviewId(edited)).isEqualTo(map(send("GET", account, "/v1/program/review", null)).get("id"));
    }

    @Test
    void withoutAProgramThereIsNothingToReview() {
        AccountId account = TestSessions.newAccount();

        assertThat(send("GET", account, "/v1/program/review", null)).hasStatus(404);
        assertThat(send("POST", account, "/v1/program/review/apply", Map.of("reviewId", "x", "suggestionIds", List.of("REP_RANGE:squat")))).hasStatus(404);
        assertThat(send("POST", account, "/v1/program/review/undo", Map.of())).hasStatus(404);
    }

    // ── apply ────────────────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void thePicksApplyInTheReviewsOrderEachLoggedAndTheProgramKeepsItsSourceRowsAndTargets() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> entered = map(send("PUT", account, "/v1/program", ownWeek(16)));
        assertThat(send("PUT", account, "/v1/program/starting-weights", Map.of("weights", List.of(Map.of("exerciseId", "bench_press", "kg", 80)))))
                .hasStatusOk();

        MvcTestResult applied = send("POST", account, "/v1/program/review/apply", Map.of("reviewId", reviewId(entered),
                "suggestionIds", List.of("REP_RANGE:squat", "TOO_MANY_SETS:chest")));

        assertThat(applied).hasStatusOk();
        Map<String, Object> program = map(applied);
        assertThat(program).containsEntry("id", entered.get("id")).containsEntry("source", "OWN");
        assertThat(dayIds(program)).isEqualTo(dayIds(entered));
        assertThat(appliedIds(program)).containsExactly("TOO_MANY_SETS:chest", "REP_RANGE:squat");
        assertThat(suggestions(program)).containsExactly("TOO_FEW_SETS:hamstrings");
        assertThat(kg(move(program, "bench_press").get("nextLoadKg"))).isEqualByComparingTo("80");
        assertThat(move(program, "squat")).containsEntry("reps", Map.of("min", P.wholeNumber(ParameterKey.REP_RANGE_COMPOUND_MIN),
                "max", P.wholeNumber(ParameterKey.REP_RANGE_COMPOUND_MAX)));
        assertThat(map(send("GET", account, "/v1/program", null))).isEqualTo(program);
    }

    @Test
    void anEditedGeneratedProgramStaysGenerated() throws Exception {
        // Six training days: the review brings them down to training_days_max; the days left keep their names.
        AccountId account = TestSessions.newAccount();
        Map<String, Object> generated = map(send("POST", account, "/v1/program/generate", Map.of("trainingDays",
                List.of("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"))));
        assertThat(suggestions(generated)).contains("TOO_MANY_DAYS");

        Map<String, Object> program = map(send("POST", account, "/v1/program/review/apply", Map.of("reviewId", reviewId(generated),
                "suggestionIds", List.of("TOO_MANY_DAYS"))));

        assertThat(program).containsEntry("source", "GENERATED");
        assertThat(days(program)).hasSize(P.wholeNumber(ParameterKey.TRAINING_DAYS_MAX)).allSatisfy(day -> assertThat(day).containsKey("nameKey"));
        assertThat(appliedIds(program)).containsExactly("TOO_MANY_DAYS");
    }

    @Test
    void aReviewTheProgramMovedOnFromIsRefusedAndNothingChanges() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> entered = map(send("PUT", account, "/v1/program", ownWeek(16)));
        Map<String, Object> apply = Map.of("reviewId", reviewId(entered), "suggestionIds", List.of("TOO_MANY_SETS:chest"));
        assertThat(send("POST", account, "/v1/program/review/apply", apply)).hasStatusOk();
        Map<String, Object> program = map(send("GET", account, "/v1/program", null));

        // The same picks again (a second tap): the review they were picked from is not the program's any more.
        assertThat(send("POST", account, "/v1/program/review/apply", apply)).hasStatus(409).bodyJson().extractingPath("$.code").isEqualTo("CONFLICT");
        // A suggestion the current review doesn't hold.
        assertThat(send("POST", account, "/v1/program/review/apply", Map.of("reviewId", reviewId(program), "suggestionIds", List.of("TOO_MANY_DAYS"))))
                .hasStatus(409);
        assertThat(map(send("GET", account, "/v1/program", null))).isEqualTo(program);
    }

    @Test
    void aPickListThatIsNotOneIsRefused() throws Exception {
        AccountId account = TestSessions.newAccount();
        String review = reviewId(map(send("PUT", account, "/v1/program", ownWeek(16))));
        List<String> twice = List.of("REP_RANGE:squat", "REP_RANGE:squat");
        List<String> withNull = new ArrayList<>(List.of("REP_RANGE:squat"));
        withNull.add(null);
        Map<String, Object> nullPick = new HashMap<>(Map.of("reviewId", review));
        nullPick.put("suggestionIds", withNull);

        for (Map<String, Object> body : List.<Map<String, Object>>of(Map.of("reviewId", review, "suggestionIds", List.of()),
                Map.of("reviewId", review, "suggestionIds", twice), Map.of("suggestionIds", List.of("REP_RANGE:squat")), Map.of("reviewId", review),
                nullPick)) {
            assertThat(send("POST", account, "/v1/program/review/apply", body)).as(body.toString()).hasStatus(400).bodyJson()
                    .extractingPath("$.code").isEqualTo("VALIDATION_FAILED");
        }
    }

    // ── undo ─────────────────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void undoingAnEarlierChangePutsItBackAndAppliesTheLaterOnesAgain() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> applied = applyAll(account);
        String chest = changeId(applied, "TOO_MANY_SETS:chest");
        // What the other two alone make of the same week.
        AccountId other = TestSessions.newAccount();
        Map<String, Object> theOtherTwo = map(send("POST", other, "/v1/program/review/apply", Map.of("reviewId",
                reviewId(map(send("PUT", other, "/v1/program", ownWeek(16)))), "suggestionIds", FINDINGS.subList(1, 3))));

        Map<String, Object> program = map(send("POST", account, "/v1/program/review/undo", Map.of("changeId", chest)));

        assertThat(shape(program)).isEqualTo(shape(theOtherTwo));
        assertThat(appliedIds(program)).containsExactly("TOO_FEW_SETS:hamstrings", "REP_RANGE:squat");
        assertThat(suggestions(program)).contains("TOO_MANY_SETS:chest").doesNotContain("TOO_FEW_SETS:hamstrings", "REP_RANGE:squat");
        assertThat(kg(move(program, "bench_press").get("nextLoadKg"))).isEqualByComparingTo("80");
    }

    @Test
    void undoingEveryChangePutsBackTheProgramAsEnteredWithItsTargets() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> entered = map(send("PUT", account, "/v1/program", ownWeek(16)));
        Map<String, Object> withWeights = map(send("PUT", account, "/v1/program/starting-weights",
                Map.of("weights", List.of(Map.of("exerciseId", "bench_press", "kg", 80)))));
        send("POST", account, "/v1/program/review/apply", Map.of("reviewId", reviewId(entered), "suggestionIds", FINDINGS));

        Map<String, Object> program = map(send("POST", account, "/v1/program/review/undo", Map.of()));

        assertThat(program.get("days")).isEqualTo(withWeights.get("days"));
        assertThat(map(program.get("review"))).containsEntry("id", reviewId(entered)).containsEntry("applied", List.of());
        assertThat(suggestions(program)).isEqualTo(FINDINGS);
    }

    @Test
    void anUndoneChangeUndoneAgainOrNothingToUndoChangesNothingAndAnUnknownChangeIsNotFound() throws Exception {
        AccountId account = TestSessions.newAccount();
        Map<String, Object> applied = applyAll(account);
        String squat = changeId(applied, "REP_RANGE:squat");
        Map<String, Object> once = map(send("POST", account, "/v1/program/review/undo", Map.of("changeId", squat)));

        assertThat(map(send("POST", account, "/v1/program/review/undo", Map.of("changeId", squat)))).isEqualTo(once);
        assertThat(send("POST", account, "/v1/program/review/undo", Map.of("changeId", UUID.randomUUID()))).hasStatus(404);
        Map<String, Object> none = map(send("POST", account, "/v1/program/review/undo", Map.of()));
        assertThat(map(send("POST", account, "/v1/program/review/undo", Map.of()))).isEqualTo(none);
        assertThat(map(none.get("review"))).containsEntry("applied", List.of());
    }

    @Test
    void aNewProgramStartsWithoutTheChangesOfTheOneItReplaced() throws Exception {
        AccountId account = TestSessions.newAccount();
        String chest = changeId(applyAll(account), "TOO_MANY_SETS:chest");

        Map<String, Object> replaced = map(send("PUT", account, "/v1/program", ownWeek(16)));

        assertThat(map(replaced.get("review"))).containsEntry("applied", List.of());
        assertThat(send("POST", account, "/v1/program/review/undo", Map.of("changeId", chest))).hasStatus(404);
    }

    @Test
    void anUndoAfterTheProgramChangedAnotherWayIsRefused() throws Exception {
        // A change the review's log doesn't know (here straight in the table) would be lost by putting a program back.
        AccountId account = TestSessions.newAccount();
        applyAll(account);
        jdbc.sql("update training.planned_exercise set sets = sets + 1 where account_id = :account and exercise_id = 'leg_press'")
                .param("account", account.value()).update();
        Map<String, Object> program = map(send("GET", account, "/v1/program", null));

        assertThat(send("POST", account, "/v1/program/review/undo", Map.of())).hasStatus(409);
        assertThat(map(send("GET", account, "/v1/program", null))).isEqualTo(program);
    }

    // ── helpers ──────────────────────────────────────────────────────────────────────────────────────────────────

    /**
     * The week of ProgramReviewChangesTests, entered as the user's own, with {@code chest} sets of chest a week (9 on Upper A,
     * the rest on Upper B).
     */
    private static Map<String, Object> ownWeek(int chest) {
        return Map.of("days", List.of(
                day("Upper A", "MONDAY", compound("bench_press", 5), compound("incline_dumbbell_press", 4), compound("barbell_row", 3),
                        compound("overhead_press", 2), isolation("barbell_curl", 3), isolation("triceps_pushdown", 3)),
                day("Lower A", "TUESDAY", Map.of("exerciseId", "squat", "sets", 3, "reps", Map.of("min", 3, "max", 5)), compound("romanian_deadlift", 2),
                        isolation("standing_calf_raise", 3)),
                day("Upper B", "THURSDAY", compound("dumbbell_bench_press", chest - 9 - 3), isolation("cable_fly", 3), compound("seated_row", 3),
                        compound("dumbbell_shoulder_press", 2), isolation("dumbbell_curl", 3), isolation("overhead_triceps_extension", 3)),
                day("Lower B", "FRIDAY", compound("leg_press", 3), compound("hip_thrust", 2), isolation("seated_calf_raise", 3))));
    }

    @SafeVarargs
    private static Map<String, Object> day(String name, String weekday, Map<String, Object>... moves) {
        return Map.of("name", name, "weekday", weekday, "exercises", List.of(moves));
    }

    private static Map<String, Object> compound(String exercise, int sets) {
        return Map.of("exerciseId", exercise, "sets", sets, "reps", Map.of("min", P.wholeNumber(ParameterKey.REP_RANGE_COMPOUND_MIN),
                "max", P.wholeNumber(ParameterKey.REP_RANGE_COMPOUND_MAX)));
    }

    private static Map<String, Object> isolation(String exercise, int sets) {
        return Map.of("exerciseId", exercise, "sets", sets, "reps", Map.of("min", P.wholeNumber(ParameterKey.REP_RANGE_ISOLATION_MIN),
                "max", P.wholeNumber(ParameterKey.REP_RANGE_ISOLATION_MAX)));
    }

    /** The own week with a starting weight on the bench (80 kg) and every suggestion applied. */
    private Map<String, Object> applyAll(AccountId account) throws Exception {
        Map<String, Object> entered = map(send("PUT", account, "/v1/program", ownWeek(16)));
        send("PUT", account, "/v1/program/starting-weights", Map.of("weights", List.of(Map.of("exerciseId", "bench_press", "kg", 80))));
        MvcTestResult applied = send("POST", account, "/v1/program/review/apply", Map.of("reviewId", reviewId(entered), "suggestionIds", FINDINGS));
        assertThat(applied).hasStatusOk();
        assertThat(appliedIds(map(applied))).isEqualTo(FINDINGS);
        return map(applied);
    }

    private static String reviewId(Map<String, Object> program) {
        return (String) map(program.get("review")).get("id");
    }

    @SuppressWarnings("unchecked")
    private static List<String> suggestions(Map<String, Object> program) {
        return ((List<Map<String, Object>>) map(program.get("review")).get("suggestions")).stream().map(s -> (String) s.get("id")).toList();
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> applied(Map<String, Object> program) {
        return (List<Map<String, Object>>) map(program.get("review")).get("applied");
    }

    private static List<String> appliedIds(Map<String, Object> program) {
        return applied(program).stream().map(change -> (String) map(change.get("suggestion")).get("id")).toList();
    }

    private static String changeId(Map<String, Object> program, String suggestion) {
        return applied(program).stream().filter(change -> map(change.get("suggestion")).get("id").equals(suggestion))
                .map(change -> (String) change.get("id")).findFirst().orElseThrow();
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> days(Map<String, Object> program) {
        return (List<Map<String, Object>>) program.get("days");
    }

    private static List<Object> dayIds(Map<String, Object> program) {
        return days(program).stream().map(day -> day.get("id")).toList();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> move(Map<String, Object> program, String exercise) {
        return days(program).stream().flatMap(day -> ((List<Map<String, Object>>) day.get("exercises")).stream())
                .filter(move -> move.get("exerciseId").equals(exercise)).findFirst().orElseThrow();
    }

    /** Each day's moves as "exercise sets min-max". */
    @SuppressWarnings("unchecked")
    private static List<List<String>> shape(Map<String, Object> program) {
        return days(program).stream().map(day -> ((List<Map<String, Object>>) day.get("exercises")).stream()
                .map(move -> move.get("exerciseId") + " " + move.get("baseSets") + " " + map(move.get("reps")).get("min") + "-"
                        + map(move.get("reps")).get("max")).toList()).toList();
    }

    private static BigDecimal kg(Object kg) {
        return new BigDecimal(kg.toString());
    }

    private MvcTestResult send(String method, AccountId account, String uri, Object body) {
        var request = switch (method) {
            case "GET" -> mvc.get();
            case "PUT" -> mvc.put();
            default -> mvc.post();
        };
        request = request.uri(uri).header("Authorization", TestSessions.bearer(context, account));
        if (body != null) {
            request = request.contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(body));
        }
        return request.exchange();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(Object value) {
        return (Map<String, Object>) value;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(MvcTestResult result) throws Exception {
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }
}
