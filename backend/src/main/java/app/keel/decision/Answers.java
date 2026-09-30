package app.keel.decision;

import app.keel.engine.CheckIn;
import java.math.BigDecimal;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * The check-in answers as the engine reads them (K-212): choices for how it looks, training, recovery and appetite, and
 * the one-tap cycle question. Anything not answered stays UNKNOWN and the engine asks instead of guessing (U3). The
 * scales and the waist are read with the questions that ask them (K-213). The cycle answer drives the safety net and is
 * never stored (ADR-020 L-1).
 */
final class Answers {

    /** Contract QuestionKind. */
    enum Kind { TRAINING, RECOVERY, SLEEP_QUALITY, ENERGY, LOOK, WAIST, APPETITE, CYCLE_STOPPED }

    /** Contract Answer: exactly the field its question's format names is set. */
    record Answer(Kind kind, Integer scale, String choice, BigDecimal cm) {
    }

    record Read(CheckIn checkIn, boolean menstrualLossReported) {
    }

    private static final Set<Kind> CHOICES = EnumSet.of(Kind.LOOK, Kind.TRAINING, Kind.RECOVERY, Kind.APPETITE, Kind.CYCLE_STOPPED);

    private Answers() {
    }

    /** IllegalArgumentException for an answer the engine cannot read: a choice it does not have, a kind twice, the wrong field. */
    static Read read(List<Answer> answers) {
        CheckIn.Look look = CheckIn.Look.UNKNOWN;
        CheckIn.Training training = CheckIn.Training.UNKNOWN;
        CheckIn.Recovery recovery = CheckIn.Recovery.UNKNOWN;
        CheckIn.Appetite appetite = CheckIn.Appetite.UNKNOWN;
        boolean cycleStopped = false;
        Set<Kind> seen = EnumSet.noneOf(Kind.class);
        for (Answer answer : answers) {
            require(answer != null && answer.kind() != null && seen.add(answer.kind()), "each question is answered once");
            require(CHOICES.contains(answer.kind()), answer.kind() + " is read with its question (K-213)");
            require(answer.choice() != null && answer.scale() == null && answer.cm() == null, answer.kind() + " is a choice");
            switch (answer.kind()) {
                case LOOK -> look = choice(CheckIn.Look.class, answer.choice());
                case TRAINING -> training = choice(CheckIn.Training.class, answer.choice());
                case RECOVERY -> recovery = choice(CheckIn.Recovery.class, answer.choice());
                case APPETITE -> appetite = choice(CheckIn.Appetite.class, answer.choice());
                case CYCLE_STOPPED -> {
                    require(answer.choice().equals("YES") || answer.choice().equals("NO"), "CYCLE_STOPPED is YES or NO");
                    cycleStopped = answer.choice().equals("YES");
                }
                default -> throw new IllegalStateException("unreachable: " + answer.kind());
            }
        }
        return new Read(new CheckIn(look, training, recovery, CheckIn.Waist.UNKNOWN, Optional.empty(), appetite), cycleStopped);
    }

    // UNKNOWN is the engine's word for "not answered", never an answer.
    private static <E extends Enum<E>> E choice(Class<E> type, String choice) {
        require(!"UNKNOWN".equals(choice), "UNKNOWN is not an answer");
        try {
            return Enum.valueOf(type, choice);
        } catch (IllegalArgumentException notAChoice) {
            throw new IllegalArgumentException("Not a " + type.getSimpleName() + " choice: " + choice, notAChoice);
        }
    }

    private static void require(boolean ok, String problem) {
        if (!ok) {
            throw new IllegalArgumentException("Check-in answers: " + problem);
        }
    }
}
