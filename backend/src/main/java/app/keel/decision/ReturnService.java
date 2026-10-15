package app.keel.decision;

import app.keel.consent.ConsentGate;
import app.keel.consent.ConsentKind;
import app.keel.engine.ParameterSet;
import app.keel.engine.Parameters;
import app.keel.engine.Sex;
import app.keel.measurement.Measurements;
import app.keel.nutrition.MealTotals;
import app.keel.profile.ProfileFacts;
import app.keel.profile.Profiles;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import app.keel.training.ReturnAnswers;
import app.keel.training.TrainingLog;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Coming back after a gap (K-1020, ADR-077 #5 and Ek 8): the days since the user's last log, whether to ask, what to offer
 * first, the day of the next call, and the answer kept once per gap. The last log is read from every module that holds
 * one (a session and cardio from training, a weigh-in from measurement, a meal from nutrition — never their tables);
 * weigh-ins and meals only with the HEALTH_DATA consent. The rules are {@link ReturnGap}'s.
 */
@Service
class ReturnService {

    /** Contract ReturnSummary; {@code nextCallOn} absent without the HEALTH_DATA consent. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record View(int awayDays, boolean shouldPrompt, ReturnGap.Suggestion suggested, LocalDate nextCallOn) {
    }

    /** The calendar and the logs as they are today. */
    private record Reading(ProfileFacts profile, Parameters parameters, LocalDate today, Optional<LocalDate> lastLog, Optional<LocalDate> lastSession) {
    }

    private final ConsentGate consent;
    private final Profiles profiles;
    private final TrainingLog training;
    private final Measurements measurements;
    private final MealTotals meals;
    private final ReturnAnswers answers;
    private final DecisionService decisions;
    private final ParameterSet parameters;
    private final Clock clock;

    ReturnService(ConsentGate consent, Profiles profiles, TrainingLog training, Measurements measurements, MealTotals meals, ReturnAnswers answers,
            DecisionService decisions, ParameterSet parameters, Clock clock) {
        this.consent = consent;
        this.profiles = profiles;
        this.training = training;
        this.measurements = measurements;
        this.meals = meals;
        this.answers = answers;
        this.decisions = decisions;
        this.parameters = parameters;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    View summary(AccountId account) {
        return view(account, read(account));
    }

    /** CONFLICT when there is no gap to answer: an answer given for none would silence the gap that comes later. */
    @Transactional
    View answer(AccountId account, ReturnAnswers.Choice choice) {
        Reading now = read(account);
        if (!ReturnGap.hasGap(now.lastLog(), now.today(), now.parameters())) {
            throw new ApiException(ErrorCode.CONFLICT);
        }
        answers.save(account, choice, now.lastLog().orElseThrow(), clock.instant());
        return view(account, now);
    }

    private View view(AccountId account, Reading now) {
        return new View(ReturnGap.awayDays(now.lastLog(), now.today()),
                ReturnGap.shouldPrompt(now.lastLog(), now.today(), answers.of(account), now.profile().timeZone(), now.parameters()),
                ReturnGap.suggested(now.lastSession(), now.today(), now.parameters()), decisions.nextCallOn(account, now.profile(), now.today()).orElse(null));
    }

    private Reading read(AccountId account) {
        ProfileFacts profile = profiles.of(account).orElseThrow(() -> new ApiException(ErrorCode.CONFLICT));
        ZoneId zone = profile.timeZone();
        LocalDate today = LocalDate.now(clock.withZone(zone));
        boolean health = consent.granted(account, ConsentKind.HEALTH_DATA);
        // The last session before today is the one the program measures a break from; the last log counts today's too.
        Optional<LocalDate> lastSession = training.lastSessionBefore(account, today.atStartOfDay(zone).toInstant()).map(at -> day(at, zone));
        Optional<LocalDate> lastLog = ReturnGap.lastLog(
                training.lastSessionBefore(account, today.plusDays(1).atStartOfDay(zone).toInstant()).map(at -> day(at, zone)),
                training.lastCardioDay(account),
                health ? measurements.lastWeighInDay(account) : Optional.empty(),
                health ? meals.lastMealDay(account) : Optional.empty());
        return new Reading(profile, parameters.forSex(Sex.valueOf(profile.sex().name())), today, lastLog, lastSession);
    }

    private static LocalDate day(Instant at, ZoneId zone) {
        return at.atZone(zone).toLocalDate();
    }
}
