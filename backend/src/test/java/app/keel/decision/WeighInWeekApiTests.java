package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.engine.Action;
import app.keel.engine.Confidence;
import app.keel.engine.CopyKey;
import app.keel.engine.Decision;
import app.keel.engine.FirstWeekAdjustment;
import app.keel.engine.ParameterSet;
import app.keel.engine.Phase;
import app.keel.engine.Reason;
import app.keel.engine.RuleId;
import app.keel.engine.Sex;
import app.keel.engine.Snapshot;
import app.keel.engine.Source;
import app.keel.engine.SourceTag;
import app.keel.engine.WeightSeries;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
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
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * This week's weigh-ins in the first weeks (ADR-089 #1, contract FirstWeeks.weighInWeek): the seven days ending on the next
 * call's day, the days of them the call reads (a day's first weigh-in, typed or from Apple Health, never an import — ADR-053),
 * and, when the block cannot reach the minimum, the day the call can read the data. There until a call has read the scale.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class WeighInWeekApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    CallStore store;

    @Autowired
    ParameterSet parameters;

    @Test
    void beforeTheFirstCallTheBlockEndsOnItsDayAndCountsTheDaysWeighed() throws Exception {
        LocalDate today = today();
        AccountId account = ready(today.plusDays(3).getDayOfWeek());
        weighIn(account, today.minusDays(1), "MANUAL", 8);
        weighIn(account, today, "APPLE_HEALTH", 6);

        Map<String, Object> week = weighInWeek(account);

        // Two weighed, today's one of them, and three mornings left: reachable, so no date promised.
        assertThat(week).containsEntry("from", today.minusDays(3).toString()).containsEntry("to", today.plusDays(3).toString())
                .containsEntry("weighedDays", List.of(today.minusDays(1).toString(), today.toString())).containsEntry("needed", 4);
        assertThat(week.keySet()).containsExactlyInAnyOrder("from", "to", "weighedDays", "needed");
        assertThat(read(get(account))).containsEntry("firstCallOn", today.plusDays(3).toString());
    }

    @Test
    void aBlockThatCannotReachTheMinimumNamesTheDayTheCallCanReadTheData() throws Exception {
        LocalDate today = today();
        // The call is tomorrow: today and tomorrow are two mornings, and 1 weighed + 1 left (today is weighed) is 2 < 4.
        AccountId account = ready(today.plusDays(1).getDayOfWeek());
        weighIn(account, today, "MANUAL", 6);

        Map<String, Object> week = weighInWeek(account);

        assertThat(week).containsEntry("to", today.plusDays(1).toString()).containsEntry("weighedDays", List.of(today.toString()));
        assertThat(week.keySet()).containsExactlyInAnyOrder("from", "to", "weighedDays", "needed", "callsFrom");
        assertThat(LocalDate.parse((String) week.get("callsFrom"))).isAfter(today.plusDays(1));
    }

    @Test
    void anImportedWeighInIsNotCountedAndADayIsCountedOnce() throws Exception {
        LocalDate today = today();
        AccountId account = ready(today.plusDays(3).getDayOfWeek());
        weighIn(account, today.minusDays(1), "IMPORT", 6);
        weighIn(account, today.minusDays(2), "IMPORT", 6);
        // An import on a day the user also typed one: the typed one counts.
        weighIn(account, today.minusDays(3), "IMPORT", 6);
        weighIn(account, today.minusDays(3), "MANUAL", 8);
        // Two typed on one day: one day.
        weighIn(account, today, "MANUAL", 7);
        weighIn(account, today, "MANUAL", 8);

        assertThat(weighInWeek(account)).containsEntry("weighedDays", List.of(today.minusDays(3).toString(), today.toString()));
    }

    @Test
    void afterANoDecisionYetTheBlockEndsOnTheDayItOpensTheNextCall() throws Exception {
        LocalDate today = today();
        AccountId account = ready(today.getDayOfWeek());
        keep(account, new Action.NoDecisionYet(), today, false);

        Map<String, Object> week = weighInWeek(account);

        // The call was made today, on the check-in day: the next opens a week on, and its block is the week after today.
        assertThat(week).containsEntry("from", today.plusDays(1).toString()).containsEntry("to", today.plusWeeks(1).toString())
                .containsEntry("weighedDays", List.of());
    }

    @Test
    void onceACallHasReadTheScaleThereIsNoWeighInWeek() throws Exception {
        LocalDate today = today();
        AccountId account = ready(today.getDayOfWeek());
        keep(account, new Action.Continue(), today, false);

        assertThat(read(get(account))).doesNotContainKey("weighInWeek");
    }

    @Test
    void theCallThatClosesTheFirstWeekReadsSessionsSoTheCountGoesOn() throws Exception {
        LocalDate today = today();
        AccountId account = ready(today.getDayOfWeek());
        keep(account, new Action.Continue(), today, true);

        assertThat(weighInWeek(account)).containsEntry("to", today.plusWeeks(1).toString());
    }

    // ── helpers ─────────────────────────────────────────────────────────────────────────────────────────────

    /** A man in UTC with the consent and a profile checking in on that weekday; his profile saved now. */
    private AccountId ready(DayOfWeek checkInDay) {
        AccountId account = TestSessions.newAccount();
        assertThat(send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA))).hasStatusOk();
        assertThat(send(account, "PUT", "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", checkInDay.name(), "timeZone", "UTC")))).hasStatusOk();
        return account;
    }

    /** A call kept for the check-in week {@code weekOf}, made on that day; the one that closes the first week when asked. */
    private void keep(AccountId account, Action action, LocalDate weekOf, boolean closesTheFirstWeek) {
        Snapshot snapshot = new Snapshot(weekOf, Sex.MALE, Phase.CUT, weekOf, new WeightSeries(List.of()));
        if (closesTheFirstWeek) {
            snapshot = snapshot.withFirstWeek(new FirstWeekAdjustment.Week(3, 3, 3, List.of(), Optional.empty()));
        }
        Decision decision = new Decision(action, List.of(new Reason(new RuleId("r"), new Source("arastirma/x.md#1", SourceTag.LITERATURE))),
                Confidence.MEDIUM, weekOf.plusDays(7), new CopyKey("decision.continue"));
        assertThat(store.keep(account, new CallStore.Call(UUID.randomUUID(), UUID.randomUUID(), weekOf, weekOf, Instant.now(), parameters.versionHash(),
                StoredSnapshot.of(snapshot), DecisionJson.of(decision), CallStore.Application.NOT_NEEDED))).isTrue();
    }

    /** A weigh-in on {@code day} at {@code hour} UTC (a minute ago when that is still to come today) from {@code source}. */
    private void weighIn(AccountId account, LocalDate day, String source, int hour) {
        Instant at = day.atTime(hour, 0).toInstant(ZoneOffset.UTC);
        assertThat(send(account, "POST", "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(),
                "measuredAt", (at.isAfter(Instant.now()) ? Instant.now().minusSeconds(60) : at).toString(), "kg", 85.0, "source", source)))
                .hasStatus(201);
    }

    private Map<String, Object> weighInWeek(AccountId account) throws Exception {
        Map<String, Object> week = read(get(account));
        assertThat(week).containsKey("weighInWeek");
        @SuppressWarnings("unchecked")
        Map<String, Object> block = (Map<String, Object>) week.get("weighInWeek");
        return block;
    }

    private static LocalDate today() {
        return LocalDate.now(ZoneOffset.UTC);
    }

    private MvcTestResult get(AccountId account) {
        return send(account, "GET", "/v1/first-weeks", null);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> read(MvcTestResult result) throws Exception {
        assertThat(result).hasStatusOk();
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }

    private MvcTestResult send(AccountId account, String method, String uri, Object body) {
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
}
