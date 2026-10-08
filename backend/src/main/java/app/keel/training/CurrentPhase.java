package app.keel.training;

import app.keel.engine.Phase;
import app.keel.shared.AccountId;
import java.util.Optional;

/**
 * The phase in force, for cardio's default (K-959, ADR-074 #1: the engine's phase, the one "Decide for me" chose too).
 * Phases are set by calls (decision), and decision depends on training, so training asks through this interface instead
 * of depending back: decision provides the bean, as for nutrition's DailyTargets. Until it does, or without a profile,
 * there is none, and no default cardio.
 */
public interface CurrentPhase {

    Optional<Phase> of(AccountId account);
}
