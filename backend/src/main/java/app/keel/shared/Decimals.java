package app.keel.shared;

import java.math.BigDecimal;

/** Decimal numbers as the API writes them (K-206 review): 80, not 8E+1; 82.4, not 82.40. */
public final class Decimals {

    private Decimals() {
    }

    public static BigDecimal plain(BigDecimal value) {
        BigDecimal stripped = value.stripTrailingZeros();
        return stripped.scale() < 0 ? stripped.setScale(0) : stripped;
    }
}
