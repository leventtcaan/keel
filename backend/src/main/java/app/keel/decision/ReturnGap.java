package app.keel.decision;

import app.keel.engine.ParameterKey;
import app.keel.engine.Parameters;
import app.keel.engine.ReturnLoad;
import app.keel.training.ReturnAnswers;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.Optional;

/**
 * The return question's rules (K-1020, ADR-077 #5 and Ek 8), pure: days come in, nothing is read. The gap runs from the
 * last log to today; it is asked when it has reached return_prompt_days and was not answered; what is offered first is
 * the program's own reading of the last session ({@link ReturnLoad#afterBreak}), so the screen and the targets agree.
 */
final class ReturnGap {

    /** Contract ReturnSuggestion. */
    enum Suggestion {
        EASE_BACK, PICK_UP
    }

    private ReturnGap() {
    }

    /** The latest of the days the logs of every kind were last made on. */
    @SafeVarargs
    static Optional<LocalDate> lastLog(Optional<LocalDate>... days) {
        return Arrays.stream(days).flatMap(Optional::stream).max(LocalDate::compareTo);
    }

    /** Days from the last log to today; none with no log, and never negative (a calendar that moved west since). */
    static int awayDays(Optional<LocalDate> lastLog, LocalDate today) {
        return lastLog.map(last -> (int) Math.max(0, ChronoUnit.DAYS.between(last, today))).orElse(0);
    }

    /** A gap to answer: there is a log, and the days since it have reached return_prompt_days. No log is a new user, not a return. */
    static boolean hasGap(Optional<LocalDate> lastLog, LocalDate today, Parameters parameters) {
        return lastLog.isPresent() && awayDays(lastLog, today) >= parameters.wholeNumber(ParameterKey.RETURN_PROMPT_DAYS);
    }

    /** Asked: a gap, not answered yet. A newer log than the answer's has begun another gap. */
    static boolean shouldPrompt(Optional<LocalDate> lastLog, LocalDate today, Optional<ReturnAnswers.Answer> answer, Parameters parameters) {
        return hasGap(lastLog, today, parameters) && answer.filter(given -> given.coversGapFrom(lastLog.orElseThrow())).isEmpty();
    }

    /** Ease back in when the program would show a step lighter (K-531), else pick up; nothing to ease back into with no session. */
    static Suggestion suggested(Optional<LocalDate> lastSession, LocalDate today, Parameters parameters) {
        return lastSession.filter(day -> ReturnLoad.afterBreak(day, today, parameters)).isPresent() ? Suggestion.EASE_BACK : Suggestion.PICK_UP;
    }

    /**
     * The day the next call can be made: the first call's day before the first call; else today while this check-in week's
     * call is not made (it is open), else the next check-in day.
     */
    static LocalDate nextCallOn(Optional<LocalDate> firstCallOn, LocalDate weekOf, boolean callMadeThisWeek, LocalDate today) {
        return firstCallOn.orElseGet(() -> callMadeThisWeek ? weekOf.plusWeeks(1) : today);
    }
}
