package app.keel.measurement;

import java.math.BigDecimal;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * What a measurement can be and how much one request may ask for (K-206, application.yml › keel.measurement). The
 * decimals are the columns' (V5: kg with 2, cm with 1): a finer value would be rounded by the database, silently.
 */
@ConfigurationProperties("keel.measurement")
record MeasurementLimits(BigDecimal maxWeightKg, BigDecimal maxWaistCm, int maxRangeDays) {

    static final int KG_DECIMALS = 2;
    static final int CM_DECIMALS = 1;

    boolean weight(BigDecimal kg) {
        return kg != null && kg.signum() > 0 && kg.compareTo(maxWeightKg) <= 0 && kg.stripTrailingZeros().scale() <= KG_DECIMALS;
    }

    boolean waist(BigDecimal cm) {
        return cm != null && cm.signum() > 0 && cm.compareTo(maxWaistCm) <= 0 && cm.stripTrailingZeros().scale() <= CM_DECIMALS;
    }

    boolean range(java.time.LocalDate from, java.time.LocalDate to) {
        return !to.isBefore(from) && java.time.temporal.ChronoUnit.DAYS.between(from, to) < maxRangeDays;
    }

}
