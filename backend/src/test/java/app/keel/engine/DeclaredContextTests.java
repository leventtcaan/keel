package app.keel.engine;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * Which declared states are health data (K-1021, ADR-077 Ek 6; Levent 14 Oct): sickness and pain are, so they wait for the
 * HEALTH_DATA consent (GDPR Art. 9) and go with it; traveling, a busy week and a new gym are calendar facts, saved without it.
 */
class DeclaredContextTests {

    private static final Map<DeclaredContext, Boolean> HEALTH = Map.of(
            DeclaredContext.TRAVELING, false,
            DeclaredContext.SICK, true,
            DeclaredContext.PAIN, true,
            DeclaredContext.BUSY, false,
            DeclaredContext.NEW_GYM, false);

    @Test
    void onlySicknessAndPainAreHealthData() {
        HEALTH.forEach((kind, health) -> assertThat(kind.isHealthData()).as(kind.name()).isEqualTo(health));
    }

    @Test
    void theTableNamesEveryState() {
        // A state added later is a decision about its consent too: it is not in the table until someone decides.
        assertThat(HEALTH.keySet()).containsExactlyInAnyOrderElementsOf(Arrays.asList(DeclaredContext.values()));
    }
}
