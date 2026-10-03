package app.keel.engine;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Back after a long break (K-531, ADR-043 #75): G7 K-72 says the first session back is not at full load, and gives no
 * number; the product's number is one engine step — the region's load step (K-109) — when the target comes from a session
 * at least return_step_back_after_weeks ago. A shorter break changes nothing: strength holds over two weeks off
 * (Hortobágyi 1993, Hwang 2017) and drops faster only after about four (H9 §1). Pure: the days come in (ADR-003).
 */
public final class ReturnLoad {

    static final RuleId RETURN_AFTER_BREAK = new RuleId("return_after_break");
    static final Source SOURCE = new Source("arastirma/ham/guray/G7-whisper-arsiv.md#K-72", SourceTag.PRODUCT);

    private ReturnLoad() {
    }

    /** Whether the session a target came from ({@code targetFrom}, the user's day) is a long break before {@code today}. */
    public static boolean afterBreak(LocalDate targetFrom, LocalDate today, Parameters parameters) {
        long weeks = parameters.wholeNumber(ParameterKey.RETURN_STEP_BACK_AFTER_WEEKS);
        return ChronoUnit.DAYS.between(targetFrom, today) >= weeks * 7;
    }

    /** The last load one of the region's steps lighter, never below nothing (a bodyweight move stays at its own weight). */
    public static BigDecimal stepBack(BigDecimal lastKg, BodyRegion region, Parameters parameters) {
        BigDecimal step = BigDecimal.valueOf(parameters.number(region == BodyRegion.UPPER ? ParameterKey.LOAD_INCREMENT_UPPER_KG
                : ParameterKey.LOAD_INCREMENT_LOWER_KG));
        return lastKg.subtract(step).max(BigDecimal.ZERO).stripTrailingZeros();
    }
}
