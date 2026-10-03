package app.keel.decision;

import app.keel.engine.CheckIn;
import app.keel.engine.Sex;
import java.math.BigDecimal;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * The check-in answers as the engine reads them (K-212): choices for how it looks, training, recovery and appetite.
 * Anything not answered stays UNKNOWN and the engine asks instead of guessing (U3). The scales and the waist are read with
 * the questions that ask them (K-213). The cycle question is a woman's (V4, K-222): taken from anyone it stopped a man's
 * plan (K-212 review). Its answer is read for this call only and never kept (ADR-020 L-1).
 */
final class Answers {

    /** Contract QuestionKind. */
    enum Kind { TRAINING, RECOVERY, SLEEP_QUALITY, ENERGY, LOOK, WAIST, APPETITE, CYCLE_STOPPED, STATE_STILL }

    /** Contract Answer: exactly the field its question's format names is set. */
    record Answer(Kind kind, Integer scale, String choice, BigDecimal cm) {
    }

    /** {@code stateOver}: the declared state is not still so (STATE_STILL NO, K-516); {@code stillSo}: it is (YES, K-525). */
    record Read(CheckIn checkIn, boolean menstrualLossReported, boolean cycleResolved, boolean stateOver, boolean stillSo) {
    }

    private static final Set<Kind> CHOICES = EnumSet.of(Kind.LOOK, Kind.TRAINING, Kind.RECOVERY, Kind.APPETITE, Kind.CYCLE_STOPPED,
            Kind.STATE_STILL);

    private Answers() {
    }

    /** The cycle question's answers (V4). */
    enum Cycle { YES, NO }

    /** Whether a declared state is still so (K-516). */
    enum StillSo { YES, NO }

    /** IllegalArgumentException for an answer the engine cannot read: a choice it does not have, a kind twice, the wrong field. */
    static Read read(List<Answer> answers, Sex sex) {
        CheckIn.Look look = CheckIn.Look.UNKNOWN;
        CheckIn.Training training = CheckIn.Training.UNKNOWN;
        CheckIn.Recovery recovery = CheckIn.Recovery.UNKNOWN;
        CheckIn.Appetite appetite = CheckIn.Appetite.UNKNOWN;
        boolean cycleStopped = false;
        boolean cycleResolved = false;
        boolean stateOver = false;
        boolean stillSo = false;
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
                    require(sex == Sex.FEMALE, "the cycle question is asked only of a woman (V4)");
                    Cycle cycle = choice(Cycle.class, answer.choice());
                    cycleStopped = cycle == Cycle.YES;
                    cycleResolved = cycle == Cycle.NO; // after a hard stop, a deficit may open again (K-229)
                }
                case STATE_STILL -> {
                    stateOver = choice(StillSo.class, answer.choice()) == StillSo.NO;
                    stillSo = !stateOver;
                }
                default -> throw new IllegalStateException("unreachable: " + answer.kind());
            }
        }
        return new Read(new CheckIn(look, training, recovery, CheckIn.Waist.UNKNOWN, Optional.empty(), appetite), cycleStopped, cycleResolved,
                stateOver, stillSo);
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
