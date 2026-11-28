package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.TrainingTrend;
import app.keel.training.TrainingStatusReader.MoveEffort;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/**
 * What the coach is told about why a move felt heavy (K-1265, ADR-096 #4): only what the engine reads — each move's effort over
 * the trend window and the workouts it went lighter in — counts and words, nothing dated, and nothing at all where there is none.
 */
class CallEffortFactsTests {

    @Test
    void eachMoveWithItsEffortAndTheWorkoutsItWentLighterIn() {
        Map<String, Object> facts = CallReader.effortFacts(List.of(new MoveEffort("squat", Optional.of(TrainingTrend.Effort.RISING), 2),
                new MoveEffort("bench_press", Optional.of(TrainingTrend.Effort.STEADY), 0),
                new MoveEffort("lateral_raise", Optional.empty(), 1)), 28);

        assertThat(facts).isEqualTo(Map.of("windowDays", 28, "moves", List.of(
                Map.of("move", "squat", "effort", "RISING", "wentLighterWorkouts", 2),
                Map.of("move", "bench_press", "effort", "STEADY"),
                Map.of("move", "lateral_raise", "wentLighterWorkouts", 1))));
    }

    @Test
    void nothingReadIsNothingTold() {
        assertThat(CallReader.effortFacts(List.of(), 28)).isEmpty();
    }
}
