package app.keel.training;

import java.math.BigDecimal;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** What a gym can be (K-414, keel.training.gym; the contract's GymInput says the same). */
@ConfigurationProperties("keel.training.gym")
record GymLimits(int maxName, int maxPlates, int maxDumbbells, int maxMachines, BigDecimal maxBarKg, BigDecimal maxDumbbellKg,
        BigDecimal maxPlateKg, BigDecimal maxStepKg, int gyms) {
}
