package app.keel.engine;

import java.math.BigDecimal;
import java.math.MathContext;
import java.util.Optional;

/**
 * The engine's internal fat estimate (K-224, ADR-027 #11). U4: an input the engine reads, never a number anyone sees.
 *
 * <ul>
 *   <li><b>From waist and height</b>: Relative Fat Mass = rfm_intercept − rfm_height_to_waist × height / waist +
 *       rfm_female_offset for a woman (Woolcott &amp; Bergman 2018 against DXA; H8 A1) — a rough band, for the gates only.</li>
 *   <li><b>From the reference look</b> the user picks: look_level_first + look_level_step × (level − 1) (Ö-4).</li>
 *   <li>Both: the smaller — the safety rules that read it are most protective there (H8 C).</li>
 * </ul>
 */
public final class FatEstimate {

    private FatEstimate() {
    }

    public static BigDecimal rfm(int heightCm, BigDecimal waistCm, Parameters parameters) {
        BigDecimal heightToWaist = BigDecimal.valueOf(heightCm).divide(waistCm, MathContext.DECIMAL64);
        return number(ParameterKey.RFM_INTERCEPT_PCT, parameters).subtract(number(ParameterKey.RFM_HEIGHT_TO_WAIST_PCT, parameters).multiply(heightToWaist))
                .add(parameters.sex() == Sex.FEMALE ? number(ParameterKey.RFM_FEMALE_OFFSET_PCT, parameters) : BigDecimal.ZERO);
    }

    /** {@code level} from 1 to {@link #levels}. */
    public static BigDecimal fromLook(int level, Parameters parameters) {
        if (level < 1 || level > levels(parameters)) {
            throw new IllegalArgumentException("A look level is 1 to " + levels(parameters) + ", was " + level);
        }
        return number(ParameterKey.LOOK_LEVEL_FIRST_PCT, parameters).add(number(ParameterKey.LOOK_LEVEL_STEP_PCT, parameters)
                .multiply(BigDecimal.valueOf(level - 1L)));
    }

    public static Optional<BigDecimal> of(Optional<BigDecimal> fromLook, Optional<BigDecimal> fromWaist) {
        if (fromLook.isPresent() && fromWaist.isPresent()) {
            return Optional.of(fromLook.get().min(fromWaist.get()));
        }
        return fromLook.or(() -> fromWaist);
    }

    public static int levels(Parameters parameters) {
        return parameters.wholeNumber(ParameterKey.LOOK_LEVELS);
    }

    private static BigDecimal number(ParameterKey key, Parameters parameters) {
        return BigDecimal.valueOf(parameters.number(key));
    }
}
