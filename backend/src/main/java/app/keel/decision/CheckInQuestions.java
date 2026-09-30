package app.keel.decision;

import app.keel.engine.CheckIn;
import app.keel.engine.Decision;
import app.keel.engine.Phase;
import app.keel.engine.WeeklySpine;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Deque;
import java.util.List;
import java.util.Locale;
import java.util.function.Function;

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
        // Each answer fills a field the engine can wait for; there are finitely many, so this ends.
        while (!toTry.isEmpty() && asked.size() < budget) {
            CheckIn checkIn = toTry.poll();
            WeeklySpine.missingAnswer(engine.apply(checkIn)).ifPresent(missing -> {
                Answers.Kind kind = Answers.Kind.valueOf(missing.name());
                if (!asked.contains(kind)) {
                    asked.add(kind);
                }
                choices(kind).forEach(choice -> toTry.add(answered(checkIn, kind, choice)));
            });
        }
        return List.copyOf(asked.subList(0, Math.min(budget, asked.size())));
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
            default -> throw new IllegalArgumentException(kind + " is not a question the engine waits for");
        };
    }
}
