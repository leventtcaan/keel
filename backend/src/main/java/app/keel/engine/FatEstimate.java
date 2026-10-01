package app.keel.engine;

import java.math.BigDecimal;
import java.math.MathContext;
import java.util.Objects;
import java.util.Optional;

/**
 * The engine's internal fat estimate (K-224, ADR-027 #11). U4: an input the engine reads, never a number anyone sees.
 *
 * <ul>
 *   <li><b>From waist and height</b>: Relative Fat Mass = rfm_intercept − rfm_height_to_waist × height / waist +
 *       rfm_female_offset for a woman (Woolcott &amp; Bergman 2018 against DXA; H8 A1). A point estimate: the phase gate
 *       and the fat floor read it. Under essential fat's low end (rfm_plausible_min, J1
 *       B2) the waist was typed wrong and there is no estimate.</li>
 *   <li><b>From the reference look</b> the user picks: look_level_first + look_level_step × (level − 1) (Ö-4).</li>
 *   <li>Both: the lower and the higher are kept; each rule reads the one cautious for it (ADR-027 #11, H8 C) — the
 *       bulk gates the higher, the cut gate and the fat floor the lower.</li>
 *   <li>The low-energy rule reads the waist's estimate at the cautious end of its band ({@link #forEnergy}, K-230).</li>
 * </ul>
 */
public final class FatEstimate {

    private FatEstimate() {
    }

    /** Both estimates: the lower and the higher (the same one when there is one). */
    public record Estimate(BigDecimal lowerPct, BigDecimal higherPct) {

        public Estimate {
            Objects.requireNonNull(lowerPct, "lowerPct");
            Objects.requireNonNull(higherPct, "higherPct");
            if (higherPct.compareTo(lowerPct) < 0) {
                throw new IllegalArgumentException("The higher fat estimate is under the lower");
            }
        }
    }

    public static Optional<BigDecimal> rfm(int heightCm, BigDecimal waistCm, Parameters parameters) {
        BigDecimal heightToWaist = BigDecimal.valueOf(heightCm).divide(waistCm, MathContext.DECIMAL64);
        BigDecimal rfm = number(ParameterKey.RFM_INTERCEPT_PCT, parameters).subtract(number(ParameterKey.RFM_HEIGHT_TO_WAIST_PCT, parameters).multiply(heightToWaist))
                .add(parameters.sex() == Sex.FEMALE ? number(ParameterKey.RFM_FEMALE_OFFSET_PCT, parameters) : BigDecimal.ZERO);
        return rfm.compareTo(number(ParameterKey.RFM_PLAUSIBLE_MIN_PCT, parameters)) < 0 ? Optional.empty() : Optional.of(rfm);
    }

    /** {@code level} from 1 to {@link #levels}. */
    public static BigDecimal fromLook(int level, Parameters parameters) {
        if (level < 1 || level > levels(parameters)) {
            throw new IllegalArgumentException("A look level is 1 to " + levels(parameters) + ", was " + level);
        }
        return number(ParameterKey.LOOK_LEVEL_FIRST_PCT, parameters).add(number(ParameterKey.LOOK_LEVEL_STEP_PCT, parameters)
                .multiply(BigDecimal.valueOf(level - 1L)));
    }

    public static Optional<Estimate> of(Optional<BigDecimal> fromLook, Optional<BigDecimal> fromWaist) {
        if (fromLook.isPresent() && fromWaist.isPresent()) {
            return Optional.of(new Estimate(fromLook.get().min(fromWaist.get()), fromLook.get().max(fromWaist.get())));
        }
        return fromLook.or(() -> fromWaist).map(one -> new Estimate(one, one));
    }

    /**
     * The end of the estimate the low-energy rule reads (K-230, ADR-028 #22): the waist's RFM at the cautious end of its
     * band — rfm_energy_margin_pct lower (H8 A3), never under essential fat (rfm_plausible_min_pct) — or the look,
     * whichever is lower. Less fat is the cautious end here: more fat-free mass, less energy available, a higher floor.
     * Never above {@link Estimate#lowerPct()}.
     */
    public static Optional<BigDecimal> forEnergy(Optional<BigDecimal> fromLook, Optional<BigDecimal> fromWaist, Parameters parameters) {
        Optional<BigDecimal> cautiousWaist = fromWaist.map(rfm -> rfm.subtract(number(ParameterKey.RFM_ENERGY_MARGIN_PCT, parameters))
                .max(number(ParameterKey.RFM_PLAUSIBLE_MIN_PCT, parameters)));
        return of(fromLook, cautiousWaist).map(Estimate::lowerPct);
    }

    public static int levels(Parameters parameters) {
        return parameters.wholeNumber(ParameterKey.LOOK_LEVELS);
    }

    private static BigDecimal number(ParameterKey key, Parameters parameters) {
        return BigDecimal.valueOf(parameters.number(key));
    }
}
