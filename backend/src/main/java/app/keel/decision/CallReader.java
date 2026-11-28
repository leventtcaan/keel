package app.keel.decision;

import app.keel.engine.ActionTally;
import app.keel.engine.SafetyHold;
import app.keel.profile.ProfileFacts;
import app.keel.profile.Profiles;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.training.TrainingStatusReader;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * The calls as the coach may read them (K-505): the user's own, behind the health data consent like /v1/decisions, as
 * they are sent — sources by kind only (K-523). The coach tells a call; it never makes or changes one (U1).
 */
@Service
public class CallReader {

    private final DecisionService decisions;
    private final Profiles profiles;

    CallReader(DecisionService decisions, Profiles profiles) {
        this.decisions = decisions;
        this.profiles = profiles;
    }

    /** The call with this id, or the latest when none is given. */
    public Optional<CallFacts> call(AccountId account, Optional<UUID> id) {
        HeldRelease.run(() -> decisions.releaseHeld(account));
        // A call held back for want of the subscription is not the coach's to tell (ADR-091 Ek 1).
        Optional<CallStore.Call> found = id.map(given -> decisions.find(account, given)).orElseGet(() -> decisions.current(account))
                .filter(call -> !decisions.locked(account, call));
        // The day the next call opens is the Decision's own (K-1024, K-1032): the coach names it, the phone works out no date.
        return found.map(call -> facts(account, call, decisions.nextCallDay(account).apply(call)));
    }

    @SuppressWarnings("unchecked")
    private CallFacts facts(AccountId account, CallStore.Call call, LocalDate nextCallOn) {
        Map<String, Object> sent = SourceView.sent(call.decision());
        // Each reason with the numbers it read (K-1000): the conversational coach may say them, and only them (ADR-092 #2).
        List<CallFacts.Rule> reasons = decisions.withFacts(call, (List<Map<String, Object>>) sent.get("reasons")).stream()
                .map(reason -> new CallFacts.Rule((String) reason.get("rule"), (String) ((Map<String, Object>) reason.get("source")).get("tag"),
                        (Map<String, Object>) reason.get("facts")))
                .toList();
        // A call resting on the safety net (U6) or waiting for the cycle question (V4): the engine's own words only (K-505 review).
        boolean untellable = SafetyCalls.restsOnTheSafetyNet(call.decision())
                || reasons.stream().anyMatch(reason -> SafetyHold.CYCLE_CHECK_NEEDED.value().equals(reason.rule()));
        return new CallFacts(call.id(), call.madeOn(), (Map<String, Object>) sent.get("action"), reasons, (String) sent.get("confidence"),
                LocalDate.parse((String) sent.get("nextReview")), nextCallOn, (String) sent.get("copyKey"), !untellable, context(account));
    }

    /**
     * Why a move may have felt heavy, as the engine reads it (K-1265, ADR-096 #4): for the coach to tell to a subscriber, never a
     * cause the log does not hold. Nothing before there is a profile or a program.
     */
    public Map<String, Object> effort(AccountId account) {
        try {
            DecisionService.Efforts efforts = decisions.efforts(account);
            return effortFacts(efforts.moves(), efforts.windowDays());
        } catch (ApiException noProfileYet) {
            return Map.of();
        }
    }

    /** The facts as the coach is told them: each move with what was read of it — its effort, the workouts it went lighter in. */
    static Map<String, Object> effortFacts(List<TrainingStatusReader.MoveEffort> efforts, int windowDays) {
        if (efforts.isEmpty()) {
            return Map.of();
        }
        List<Map<String, Object>> moves = efforts.stream().map(move -> {
            Map<String, Object> told = new LinkedHashMap<>();
            told.put("move", move.exerciseId());
            move.effort().ifPresent(effort -> told.put("effort", effort.name()));
            if (move.wentLighterWorkouts() > 0) {
                told.put("wentLighterWorkouts", move.wentLighterWorkouts());
            }
            return told;
        }).toList();
        return Map.of("windowDays", windowDays, "moves", moves);
    }

    /** What surrounds the call (CallFacts): counts of this week and the profile's summary; a part that is not there yet is left out. */
    private Map<String, Object> context(AccountId account) {
        Map<String, Object> context = new LinkedHashMap<>();
        try {
            DecisionService.ConsistencyNow now = decisions.consistency(account);
            Map<String, Object> week = new LinkedHashMap<>();
            week.put("training", count(now.now().week().training()));
            week.put("protein", count(now.now().week().protein()));
            week.put("steps", count(now.now().week().steps()));
            week.put("weighIns", count(now.now().week().weighIns()));
            context.put("week", week);
            context.put("record", Map.of("onTrackWeeks", now.now().record().onTrackWeeks(), "countedWeeks", now.now().record().countedWeeks()));
        } catch (ApiException noPlanYet) {
            // Nothing counted yet: no week is told (U3: no number is made up).
        }
        profiles.of(account).ifPresent(profile -> context.put("profile", profile(profile)));
        return context;
    }

    private static Map<String, Integer> count(ActionTally tally) {
        return Map.of("planned", tally.planned(), "done", tally.counted(), "left", Math.max(0, tally.planned() - tally.counted()));
    }

    private static Map<String, Object> profile(ProfileFacts profile) {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("goal", profile.goal().name());
        profile.experience().ifPresent(experience -> summary.put("experience", experience.name()));
        summary.put("trainingDaysPerWeek", profile.trainingDays().size());
        return summary;
    }
}
