package app.keel.decision;

import app.keel.consent.ConsentGate;
import app.keel.consent.ConsentKind;
import app.keel.engine.Consistency;
import app.keel.engine.CopyKey;
import app.keel.engine.ParameterKey;
import app.keel.engine.ParameterSet;
import app.keel.engine.Parameters;
import app.keel.engine.Prompts;
import app.keel.engine.RuleId;
import app.keel.engine.Sex;
import app.keel.engine.TrainingStatus;
import app.keel.measurement.Measurements;
import app.keel.profile.ProfileFacts;
import app.keel.profile.Profiles;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import app.keel.training.TrainingLog;
import app.keel.training.PlannedDays;
import app.keel.training.TrainingStatusReader;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.time.temporal.TemporalAdjusters;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Stream;
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
    record PromptView(String rule, String key, String copyKey, List<String> choices, SourceView source) {
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
    private final WeekLogs weeks;
    private final ParameterSet parameters;
    private final Clock clock;

    PromptController(ConsentGate consent, Profiles profiles, CallStore calls, Measurements measurements, TrainingLog training,
            TrainingStatusReader statuses, StateStore states, PromptStore answers, WeekLogs weeks, ParameterSet parameters, Clock clock) {
        this.consent = consent;
        this.profiles = profiles;
        this.calls = calls;
        this.measurements = measurements;
        this.training = training;
        this.statuses = statuses;
        this.states = states;
        this.answers = answers;
        this.weeks = weeks;
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
        // From the Monday of the week before last: the two calendar weeks the steps and the loads compare.
        LocalDate weekBefore = today.with(TemporalAdjusters.previousOrSame(Consistency.WEEK_STARTS_ON)).minusWeeks(2);
        // The days a session is missed on are the program's (K-527, ADR-041 #64); the profile's when it puts none on a weekday.
        // They are asked for from when they were set: the program's from when it was made; the profile's from when the
        // profile set them, or the program was made, whichever is later.
        Set<DayOfWeek> programDays = statuses.programDays(account);
        Set<DayOfWeek> trainingDays = programDays.isEmpty() ? profile.trainingDays() : programDays;
        Stream<Optional<LocalDate>> setOn = programDays.isEmpty()
                ? Stream.of(profiles.trainingDaysSince(account).map(at -> at.atZone(zone).toLocalDate()), statuses.programSince(account, zone))
                : Stream.of(statuses.programSince(account, zone));
        LocalDate since = setOn.flatMap(Optional::stream).max(Comparator.naturalOrder()).orElse(today);
        LocalDate from = since.isBefore(weekBefore) ? since : weekBefore;
        TrainingStatusReader.Breaks breaks = statuses.breaks(account, from, today);
        // A session moved in its week is planned where it was moved, not on its weekday (K-964).
        PlannedDays planned = programDays.isEmpty() ? PlannedDays.weekly(trainingDays)
                : statuses.plannedDays(account, from, today).orElse(PlannedDays.weekly(trainingDays));
        Set<LocalDate> paused = new HashSet<>(states.days(account, from, today));
        paused.addAll(breaks.rest());
        // Every session: the miss counts from the last one, however long ago (a few hundred timestamps a year at most).
        List<LocalDate> sessions = training.workoutStarts(account, Instant.EPOCH, today.plusDays(1).atStartOfDay(zone).toInstant()).stream()
                .map(started -> started.atZone(zone).toLocalDate()).toList();
        // The loads of the calendar week just over against the week before: read as of its Sunday.
        boolean loadsDropped = statuses.status(account, weekBefore.plusWeeks(2).minusDays(1), zone, profile.checkInDay())
                .map(TrainingStatus::loadsBelowLastWeek).orElse(false);
        // Each day's step target as it was (K-220 review): a raised target does not make the weeks before a drop.
        Function<LocalDate, Integer> stepTarget = plan.map(current -> weeks.stepTargets(account, current, zone, p))
                .orElseGet(() -> day -> p.wholeNumber(ParameterKey.STEPS_TARGET_START));
        Prompts.Facts facts = new Prompts.Facts(today, plan.map(CallStore.Plan::phase), measurements.stepsByDay(account, weekBefore, today.minusDays(1)),
                stepTarget, planned::on, since, sessions, Set.copyOf(paused), breaks.lighter(), loadsDropped,
                plan.flatMap(current -> DeficitStart.of(current, calls.planSteps(account))), states.current(account, today).isPresent());
        Set<String> answered = answers.answered(account);
        return Prompts.today(facts, p).stream().filter(prompt -> !answered.contains(prompt.rule().value() + "/" + prompt.key()))
                .map(prompt -> new PromptView(prompt.rule().value(), prompt.key(), prompt.copyKey().value(), prompt.choices(), SourceView.of(prompt.source())))
                .toList();
    }

    @PostMapping("/v1/prompts/{rule}/answers")
    @Transactional
    Reply answer(AccountId account, @PathVariable String rule, @RequestBody Answer answer) {
        consent.require(account, ConsentKind.HEALTH_DATA);
        RuleId id = ruleId(rule);
        List<String> choices = Prompts.choices(id).orElseThrow(() -> new ApiException(ErrorCode.VALIDATION_FAILED));
        if (answer.choice() == null || !choices.contains(answer.choice()) || !isDay(answer.key())) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        String kept = answers.answer(account, rule, answer.key(), answer.choice(), clock.instant());
        return new Reply(Prompts.reply(id, kept).map(CopyKey::value).orElse(null));
    }

    /** A name that is no rule's at all is a request to refuse (400), not a failure (500). */
    private static RuleId ruleId(String name) {
        try {
            return new RuleId(name);
        } catch (IllegalArgumentException notARule) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
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
