package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.ParameterDomain;
import app.keel.engine.ParameterKey;
import app.keel.engine.ParameterSet;
import app.keel.engine.Phase;
import app.keel.engine.Sex;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.yaml.snakeyaml.Yaml;

/**
 * What a call changes, old to new (K-1000, ADR-077 #3 "the targets that change"), read from the call as kept: the plan
 * before and after it once applied. Declined, each change also says what the plan follows now (last week's). The first
 * week's call says how many days the scale is watched (ADR-077 #4), by the user's sex.
 */
class CallChangesTests {

    private static final LocalDate TODAY = LocalDate.of(2026, 12, 28);
    private static final Instant AT = Instant.parse("2026-12-28T08:00:00Z");
    private static final CallStore.Plan BEFORE = new CallStore.Plan(Phase.CUT, TODAY.minusDays(60), TODAY.minusDays(21), 2600, false, 8000);

    @Test
    void aCalorieCallAppliedSaysTheTargetBeforeAndAfter() {
        CallStore.Plan after = new CallStore.Plan(Phase.CUT, BEFORE.phaseStart(), TODAY, 2100, false, 8000);

        assertThat(CallChanges.of(applied(BEFORE, after))).containsExactly(
                Map.of("what", "CALORIES", "before", Map.of("targetKcal", 2600), "after", Map.of("targetKcal", 2100)));
    }

    @Test
    void aStepCallAndAChangeOfPhaseSayTheirsAndNothingElse() {
        CallStore.Plan steps = new CallStore.Plan(Phase.CUT, BEFORE.phaseStart(), BEFORE.planStart(), 2600, false, 10000);
        CallStore.Plan bulk = new CallStore.Plan(Phase.BULK, TODAY, TODAY, 2900, true, 8000);

        assertThat(CallChanges.of(applied(BEFORE, steps))).containsExactly(
                Map.of("what", "STEPS", "before", Map.of("stepsPerDay", 8000), "after", Map.of("stepsPerDay", 10000)));
        assertThat(CallChanges.of(applied(BEFORE, bulk))).containsExactly(
                Map.of("what", "CALORIES", "before", Map.of("targetKcal", 2600), "after", Map.of("targetKcal", 2900)),
                Map.of("what", "PHASE", "before", Map.of("phase", "CUT"), "after", Map.of("phase", "BULK")));
    }

    @Test
    void declinedEachChangeSaysWhatThePlanFollowsNow() {
        CallStore.Plan after = new CallStore.Plan(Phase.CUT, BEFORE.phaseStart(), TODAY, 2100, false, 8000);
        CallStore.Call declined = with(applied(BEFORE, after), CallStore.Application.DECLINED);

        assertThat(CallChanges.of(declined)).containsExactly(Map.of("what", "CALORIES", "before", Map.of("targetKcal", 2600),
                "after", Map.of("targetKcal", 2100), "inForce", Map.of("targetKcal", 2600)));
    }

    @Test
    void aCallNeverAppliedOrOneThatChangesNoTargetSaysNone() {
        assertThat(CallChanges.of(call(CallStore.Application.NOT_NEEDED, null, null))).isEmpty();
        assertThat(CallChanges.of(call(CallStore.Application.PENDING, null, null))).isEmpty();
        // A program call (the deload ladder) leaves the plan as it was: its change is the program's, in its words.
        assertThat(CallChanges.of(applied(BEFORE, BEFORE))).isEmpty();
    }

    @Test
    void theFirstWeeksCallSaysTheWatchDaysByTheUsersSex() {
        ParameterSet parameters = engineParameters();
        StoredSnapshot.FirstWeek week = new StoredSnapshot.FirstWeek(3, 3, 3, List.of(), null, List.of());

        assertThat(CallChanges.observationDays(snapshot(Sex.FEMALE, week), parameters))
                .contains(parameters.forSex(Sex.FEMALE).wholeNumber(ParameterKey.MAINTENANCE_OBSERVATION_DAYS));
        assertThat(CallChanges.observationDays(snapshot(Sex.MALE, week), parameters))
                .contains(parameters.forSex(Sex.MALE).wholeNumber(ParameterKey.MAINTENANCE_OBSERVATION_DAYS));
        assertThat(CallChanges.observationDays(snapshot(Sex.MALE, null), parameters)).as("any other call").isEmpty();
    }

    private static CallStore.Call applied(CallStore.Plan before, CallStore.Plan after) {
        return call(CallStore.Application.APPLIED, before, after);
    }

    private static CallStore.Call with(CallStore.Call call, CallStore.Application application) {
        return new CallStore.Call(call.id(), call.clientId(), call.weekOf(), call.madeOn(), call.decidedAt(), call.parametersHash(), call.snapshot(),
                call.decision(), application, call.appliedAt(), call.undoneAt(), call.planBefore(), call.planAfter(), AT);
    }

    private static CallStore.Call call(CallStore.Application application, CallStore.Plan before, CallStore.Plan after) {
        return new CallStore.Call(UUID.randomUUID(), UUID.randomUUID(), TODAY, TODAY, AT, "hash", null, Map.of(), application,
                before == null ? null : AT, null, before, after, null);
    }

    private static StoredSnapshot snapshot(Sex sex, StoredSnapshot.FirstWeek week) {
        return new StoredSnapshot(TODAY, sex, Phase.CUT, TODAY, List.of(), null, null, null, null, false, TODAY, null, null, false, null, null, null, week);
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
