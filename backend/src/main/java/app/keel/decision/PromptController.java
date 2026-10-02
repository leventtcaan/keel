package app.keel.decision;

import app.keel.consent.ConsentGate;
import app.keel.consent.ConsentKind;
import app.keel.engine.CopyKey;
import app.keel.engine.ParameterKey;
import app.keel.engine.ParameterSet;
import app.keel.engine.Parameters;
import app.keel.engine.Phase;
import app.keel.engine.Prompts;
import app.keel.engine.RuleId;
import app.keel.engine.Sex;
import app.keel.engine.Source;
import app.keel.engine.TrainingStatus;
import app.keel.measurement.Measurements;
import app.keel.profile.ProfileFacts;
import app.keel.profile.Profiles;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import app.keel.training.TrainingLog;
import app.keel.training.TrainingStatusReader;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * The coach's own questions (K-512, ADR-039): /v1/prompts — today's, from the user's logs, the ones not answered yet;
 * an answer is kept once and never changes a call. Health data (hunger, why sessions were missed): behind the
 * HEALTH_DATA consent, as every /v1/decisions route.
 */
@RestController
class PromptController {

    /** Contract Prompt. */
    record PromptView(String rule, String key, String copyKey, List<String> choices, Source source) {
    }

    record Answer(String key, String choice) {
    }

    /** Contract PromptReply: the words the answer gets back, if any. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Reply(String replyCopyKey) {
    }

    private final ConsentGate consent;
    private final Profiles profiles;
    private final CallStore calls;
    private final Measurements measurements;
    private final TrainingLog training;
    private final TrainingStatusReader statuses;
    private final StateStore states;
    private final PromptStore answers;
    private final ParameterSet parameters;
    private final Clock clock;

    PromptController(ConsentGate consent, Profiles profiles, CallStore calls, Measurements measurements, TrainingLog training,
            TrainingStatusReader statuses, StateStore states, PromptStore answers, ParameterSet parameters, Clock clock) {
        this.consent = consent;
        this.profiles = profiles;
        this.calls = calls;
        this.measurements = measurements;
        this.training = training;
        this.statuses = statuses;
        this.states = states;
        this.answers = answers;
        this.parameters = parameters;
        this.clock = clock;
    }

    @GetMapping("/v1/prompts")
    @Transactional(readOnly = true)
    List<PromptView> today(AccountId account) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        ProfileFacts profile = profiles.of(account).orElseThrow(() -> new ApiException(ErrorCode.CONFLICT));
        ZoneId zone = profile.timeZone();
        LocalDate today = LocalDate.now(clock.withZone(zone));
        Parameters p = parameters.forSex(Sex.valueOf(profile.sex().name()));
        Optional<CallStore.Plan> plan = calls.plan(account);
        int weeksLooked = p.wholeNumber(ParameterKey.MISSED_SESSIONS_IN_A_ROW);
        List<LocalDate> sessions = training.workoutStarts(account, today.minusWeeks(weeksLooked).atStartOfDay(zone).toInstant(),
                today.plusDays(1).atStartOfDay(zone).toInstant()).stream().map(started -> started.atZone(zone).toLocalDate()).toList();
        boolean loadsBelow = statuses.status(account, today, zone, profile.checkInDay()).map(TrainingStatus::loadsBelowLastWeek).orElse(false);
        // A cut's first days: the day its phase began (a plan only exists from the first call on).
        Optional<LocalDate> cutBegan = plan.filter(current -> current.phase() == Phase.CUT).map(CallStore.Plan::phaseStart);
        int stepTarget = plan.map(current -> PlanChange.steps(current, p))
                .orElseGet(() -> p.wholeNumber(ParameterKey.STEPS_TARGET_START));
        Prompts.Facts facts = new Prompts.Facts(today, measurements.stepsByDay(account, today.minusWeeks(2), today.minusDays(1)), stepTarget,
                List.copyOf(profile.trainingDays()), sessions, loadsBelow, cutBegan, states.current(account, today).isPresent());
        Set<String> answered = answers.answered(account);
        return Prompts.today(facts, p).stream().filter(prompt -> !answered.contains(prompt.rule().value() + "/" + prompt.key()))
                .map(prompt -> new PromptView(prompt.rule().value(), prompt.key(), prompt.copyKey().value(), prompt.choices(), prompt.source()))
                .toList();
    }

    @PostMapping("/v1/prompts/{rule}/answers")
    @Transactional
    Reply answer(AccountId account, @PathVariable String rule, @RequestBody Answer answer) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        RuleId id = new RuleId(rule);
        List<String> choices = Prompts.choices(id).orElseThrow(() -> new ApiException(ErrorCode.VALIDATION_FAILED));
        if (answer.choice() == null || !choices.contains(answer.choice()) || !isDay(answer.key())) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        String kept = answers.answer(account, rule, answer.key(), answer.choice(), clock.instant());
        return new Reply(Prompts.reply(id, kept).map(CopyKey::value).orElse(null));
    }

    private static boolean isDay(String key) {
        try {
            LocalDate.parse(key);
            return true;
        } catch (DateTimeParseException | NullPointerException notADay) {
            return false;
        }
    }
}
