package app.keel.nutrition;

import app.keel.shared.AccountId;
import java.time.LocalDate;
import java.util.Optional;

/**
 * The day's targets, for the budget (K-209). They are set by calls (decision, K-216), and decision depends on nutrition,
 * so nutrition asks through this interface instead of depending back: decision provides the bean. Until it does, or
 * before the user has a target, a day has none.
 */
public interface DailyTargets {

    /** A plan number each (ADR-020 L-13): kcal and protein grams for the day. */
    record Targets(int kcal, int proteinG) {
    }

    Optional<Targets> forDay(AccountId account, LocalDate day);
}
