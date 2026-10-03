package app.keel.decision;

import app.keel.engine.Action;
import app.keel.engine.CheckIn;
import app.keel.engine.Decision;
import app.keel.engine.EnergyAvailability;
import app.keel.engine.Phase;
import app.keel.engine.SafetyHold;
import app.keel.engine.Sex;
import app.keel.engine.WeeklySpine;
import java.time.LocalDate;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Stream;

/**
 * Which questions a check-in asks (K-213, U9; 04 §8.5 — the gain is in staying quiet): the engine runs on what the data
 * already says; if it would wait for an answer, that is a question, and it runs again on each possible answer to find
 * the next. No more than the week's budget. The data disagreeing with itself (looks worse, or the waist going against
 * the phase) opens the larger budget.
 */
final class CheckInQuestions {

    /** Contract Question. */
    record Question(Answers.Kind kind, String format, List<String> choices, String copyKey, String reasonCopyKey) {
    }

    private CheckInQuestions() {
    }

    static List<Answers.Kind> needed(Function<CheckIn, Decision> engine, CheckIn dataSays, int budget) {
        List<Answers.Kind> asked = new ArrayList<>();
        Deque<CheckIn> toTry = new ArrayDeque<>(List.of(dataSays));
        Set<CheckIn> tried = new HashSet<>();
        // Each answer fills a field the engine can wait for, and each CheckIn is tried once: finitely many, so this ends
        // even if the engine waited again for a field already answered (K-213 review).
        while (!toTry.isEmpty() && asked.size() < budget) {
            CheckIn checkIn = toTry.poll();
            if (!tried.add(checkIn)) {
                continue;
            }
            WeeklySpine.missingAnswer(engine.apply(checkIn)).ifPresent(missing -> {
                Answers.Kind kind = Answers.Kind.valueOf(missing.name());
                if (!asked.contains(kind)) {
                    asked.add(kind);
                }
                choices(kind).forEach(choice -> toTry.add(answered(checkIn, kind, choice)));
            });
        }
        // Appetite (K-227, G7 K-102): the engine never waits for it — a long bulk simply goes on — but only the user can
        // say it has gone. Asked when that answer would change the call, after the engine's own questions and inside the
        // budget.
        if (asked.size() < budget && !engine.apply(dataSays.withAppetite(CheckIn.Appetite.GONE)).equals(engine.apply(dataSays))) {
            asked.add(Answers.Kind.APPETITE);
        }
        return List.copyOf(asked.subList(0, Math.min(budget, asked.size())));
    }

    /**
     * Whether an answer of this kind is taken: a question the engine can wait for, asked this week or not — the cycle
     * question, whose answer is a woman's (Answers), appetite (K-227), and whether a declared state is still so (K-516).
     */
    static boolean answerable(Answers.Kind kind) {
        return kind == Answers.Kind.CYCLE_STOPPED || kind == Answers.Kind.APPETITE || kind == Answers.Kind.STATE_STILL || Arrays.stream(WeeklySpine.Missing.values()).anyMatch(missing -> missing.name().equals(kind.name()));
    }

    /** Whether the cycle question is asked (V4, ADR-020 L-1): a woman whose plan is in the low energy band. */
    static boolean asksAboutTheCycle(Sex sex, Optional<EnergyAvailability> band) {
        return sex == Sex.FEMALE && band.filter(inBand -> inBand == EnergyAvailability.LOW).isPresent();
    }

    /** Whether the call waits for the cycle question: after a hard stop, before it opens a deficit (K-229). */
    static boolean waitsForTheCycle(Decision decision) {
        return decision.action() instanceof Action.NoDecisionYet
                && decision.reasons().stream().anyMatch(reason -> reason.rule().equals(SafetyHold.CYCLE_CHECK_NEEDED));
    }

    /**
     * Whether the week's call can end waiting for the cycle question (K-229 review): on what the data says, or on any
     * answers to the questions asked — each one answered or left open. Held after a hard stop, the spine can first wait
     * for training and only then open a deficit; looking at the unanswered call alone, the cycle question would never be
     * asked and every such week would end without a call.
     */
    static boolean cycleAwaited(Function<CheckIn, Decision> engine, CheckIn dataSays, List<Answers.Kind> asked) {
        List<CheckIn> reachable = List.of(dataSays);
        for (Answers.Kind kind : asked) {
            reachable = reachable.stream().flatMap(checkIn -> Stream.concat(Stream.of(checkIn),
                    choices(kind).stream().map(choice -> answered(checkIn, kind, choice)))).toList();
        }
        return reachable.stream().map(engine).anyMatch(CheckInQuestions::waitsForTheCycle);
    }

    /**
     * Whether the check-in asks if the declared state is still so (K-516, ADR-038 #5): one is in force today, and each of
     * the last {@code weeks} weeks (this one included, Monday to Sunday) has a declared day — and, once the user said it
     * is ({@code stillSoOn}), {@code weeks} weeks on from that answer's week, not before (K-525, ADR-041 #62).
     */
    static boolean asksWhetherStillSo(boolean inForceToday, java.util.Set<LocalDate> declaredDays, LocalDate today, int weeks,
            java.util.Optional<LocalDate> stillSoOn) {
        LocalDate monday = today.with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        return inForceToday && java.util.stream.IntStream.range(0, weeks).mapToObj(monday::minusWeeks)
                .allMatch(week -> week.datesUntil(week.plusWeeks(1)).anyMatch(declaredDays::contains))
                && stillSoOn.map(said -> !said.with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY))
                        .plusWeeks(weeks).isAfter(monday)).orElse(true);
    }

    /**
     * The week's larger budget (U9: at most 5): the data disagreeing with itself, or a risky week of the first eight
     * (K-513, ADR-040 #4). A cap, not a reason to ask: the questions are still only what the engine would wait for.
     */
    static boolean largerBudget(CheckIn dataSays, Phase phase, boolean firstWeeksRisk) {
        return firstWeeksRisk || anomaly(dataSays, phase);
    }

    static boolean anomaly(CheckIn dataSays, Phase phase) {
        boolean waistAgainst = phase == Phase.CUT ? dataSays.waist() == CheckIn.Waist.UP : dataSays.waist() == CheckIn.Waist.DOWN;
        return dataSays.look() == CheckIn.Look.WORSE || waistAgainst;
    }

    static Question describe(Answers.Kind kind) {
        String name = kind.name().toLowerCase(Locale.ROOT);
        return new Question(kind, "CHOICE", choices(kind), "checkIn.question." + name, "checkIn.reason." + name);
    }

    /** The engine's answers for a question, without UNKNOWN (that is "not answered"). */
    private static List<String> choices(Answers.Kind kind) {
        Enum<?>[] values = switch (kind) {
            case TRAINING -> CheckIn.Training.values();
            case RECOVERY -> CheckIn.Recovery.values();
            case CYCLE_STOPPED -> Answers.Cycle.values();
            case APPETITE -> CheckIn.Appetite.values();
            case STATE_STILL -> Answers.StillSo.values();
            default -> throw new IllegalArgumentException(kind + " is not a question the engine waits for");
        };
        return Arrays.stream(values).map(Enum::name).filter(name -> !name.equals("UNKNOWN")).toList();
    }

    private static CheckIn answered(CheckIn checkIn, Answers.Kind kind, String choice) {
        return switch (kind) {
            case TRAINING -> new CheckIn(checkIn.look(), CheckIn.Training.valueOf(choice), checkIn.recovery(), checkIn.waist(),
                    checkIn.adherence(), checkIn.appetite());
            case RECOVERY -> new CheckIn(checkIn.look(), checkIn.training(), CheckIn.Recovery.valueOf(choice), checkIn.waist(),
                    checkIn.adherence(), checkIn.appetite());
            case APPETITE -> checkIn.withAppetite(CheckIn.Appetite.valueOf(choice));
            default -> throw new IllegalArgumentException(kind + " is not a question the engine waits for");
        };
    }
}
