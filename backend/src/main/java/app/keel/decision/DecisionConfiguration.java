package app.keel.decision;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** The decision module's own parameters, read from the phone's parameter files (ADR-029). */
@Configuration(proxyBeanMethods = false)
class DecisionConfiguration {

    /** The lengths a declared state is offered for (ADR-077 #6, K-1021), from data/parameters/state.json. */
    @Bean
    StateLengths stateLengths() {
        return StateLengths.fromClasspath();
    }
}
