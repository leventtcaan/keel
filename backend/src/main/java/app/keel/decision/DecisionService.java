package app.keel.decision;

import app.keel.consent.ConsentGate;
import app.keel.consent.ConsentKind;
import app.keel.engine.ActivityLevel;
import app.keel.engine.Decision;
import app.keel.engine.DecisionPipeline;
import app.keel.engine.InitialTarget;
import app.keel.engine.ParameterKey;
import app.keel.engine.ParameterSet;
import app.keel.engine.Parameters;
import app.keel.engine.Phase;
import app.keel.engine.Profile;
import app.keel.engine.Sex;
import app.keel.engine.Snapshot;
import app.keel.engine.WeighIn;
import app.keel.engine.WeightSeries;
import app.keel.measurement.Measurements;
import app.keel.profile.ProfileFacts;
import app.keel.profile.Profiles;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The weekly call (K-212, ADR-003): the Snapshot from the modules' APIs — the profile, the daily weights, this week's
 * answers, the plan — never their tables; the engine decides; the call is kept with its Snapshot and the parameters'
 * hash. The week is the user's check-in day in their own time zone (L3 P13).
 *
 * <p>Not yet in the Snapshot, so the engine treats them as unknown: the fat estimate (DURUM question 11), the energy
 * budget (it needs that estimate), adherence (K-213) and where training stands (the set log's summary).
 */
@Service
class DecisionService {

    private final CallStore calls;
    private final Profiles profiles;
    private final Measurements measurements;
    private final ConsentGate consent;
    private final ParameterSet parameters;
    private final Clock clock;

    DecisionService(CallStore calls, Profiles profiles, Measurements measurements, ConsentGate consent, ParameterSet parameters, Clock clock) {
        this.calls = calls;
        this.profiles = profiles;
        this.measurements = measurements;
        this.consent = consent;
        this.parameters = parameters;
        this.clock = clock;
    }

    /**
     * This week's call from these answers. A clientId sent again gets the call it made (the engine does not run twice);
     * another week's answers, or a second call this week, are CONFLICT.
     */
    @Transactional
    CallStore.Call checkIn(AccountId account, UUID clientId, LocalDate weekOf, List<Answers.Answer> answered) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        Optional<CallStore.Call> replay = calls.byClient(account, clientId);
        if (replay.isPresent()) {
            return replay.get();
        }
        // The Snapshot needs the user's sex, height, birth year and check-in day.
        ProfileFacts profile = profiles.of(account).orElseThrow(() -> new ApiException(ErrorCode.CONFLICT));
        LocalDate today = LocalDate.now(clock.withZone(profile.timeZone()));
        if (!weekOf.equals(CheckInWeek.weekOf(today, profile.checkInDay())) || calls.byWeek(account, weekOf).isPresent()) {
            throw new ApiException(ErrorCode.CONFLICT);
        }
        Answers.Read answers;
        try {
            answers = Answers.read(answered);
        } catch (IllegalArgumentException unreadable) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED, unreadable);
        }
        Sex sex = Sex.valueOf(profile.sex().name());
        Parameters p = parameters.forSex(sex);
        Profile body = new Profile(today.getYear() - profile.birthYear(), profile.heightCm());
        List<WeighIn> weights = measurements.dailyWeights(account, today.minusDays(p.wholeNumber(ParameterKey.EVALUATION_WINDOW_DAYS) - 1L), today);
        CallStore.Plan plan = calls.plan(account).orElseGet(() -> calls.start(account, firstPlan(profile, sex, body, weights, today, p)));
        Snapshot snapshot = new Snapshot(today, sex, plan.phase(), plan.planStart(), new WeightSeries(weights), Optional.empty(), Optional.empty(),
                answers.menstrualLossReported(), answers.checkIn(), Optional.of(body), plan.observingMaintenance(), plan.phaseStart(), Optional.empty());
        Decision decision = DecisionPipeline.decide(snapshot, p);
        CallStore.Call call = new CallStore.Call(UUID.randomUUID(), clientId, weekOf, today, clock.instant(), parameters.versionHash(),
                StoredSnapshot.of(snapshot), DecisionJson.of(decision), application(decision));
        if (!calls.keep(account, call)) {
            // The same clientId or this week, stored at the same moment by another request.
            return calls.byClient(account, clientId).orElseThrow(() -> new ApiException(ErrorCode.CONFLICT));
        }
        return call;
    }

    /**
     * The first plan: the direction the user chose, and the starting target — the maintenance estimate, watched before
     * it is judged (K-114). Without a weigh-in there is no estimate yet; the engine says there is not enough data.
     */
    private CallStore.Plan firstPlan(ProfileFacts profile, Sex sex, Profile body, List<WeighIn> weights, LocalDate today, Parameters p) {
        Phase phase = switch (profile.goal()) {
            case LOSE_FAT -> Phase.CUT;
            case BUILD_MUSCLE -> Phase.BULK;
            // The phase gate needs the fat estimate (DURUM questions 11, 17): no direction is guessed.
            case DECIDE_FOR_ME -> throw new ApiException(ErrorCode.CONFLICT);
        };
        Integer target = weights.isEmpty() ? null : InitialTarget.estimate(sex, weights.getLast().kg(), body,
                profile.activity().map(activity -> ActivityLevel.valueOf(activity.name())), p).maintenanceKcal();
        return new CallStore.Plan(phase, today, today, target, true);
    }

    /** Whether the call changes the plan (applied by K-216): a pause, "continue" or advice changes nothing. */
    static CallStore.Application application(Decision decision) {
        return switch (decision.action()) {
            case app.keel.engine.Action.NoDecisionYet _, app.keel.engine.Action.Continue _, app.keel.engine.Action.FixTraining _,
                 app.keel.engine.Action.FixRecovery _, app.keel.engine.Action.FixAdherence _ -> CallStore.Application.NOT_NEEDED;
            default -> CallStore.Application.PENDING;
        };
    }

    Optional<CallStore.Call> current(AccountId account) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        return calls.newestFirst(account, Optional.empty(), 1).stream().findFirst();
    }

    Optional<CallStore.Call> find(AccountId account, UUID id) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        return calls.byId(account, id);
    }

    List<CallStore.Call> page(AccountId account, Optional<UUID> before, int limit) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        Optional<CallStore.Call> cursor = before.map(id -> calls.byId(account, id).orElseThrow(() -> new ApiException(ErrorCode.VALIDATION_FAILED)));
        return calls.newestFirst(account, cursor, limit);
    }
}
