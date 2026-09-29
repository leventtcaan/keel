package app.keel.engine;

import java.util.List;

/** One example of every action, for tests that must hold for the whole vocabulary. */
final class Actions {

    private Actions() {
    }

    static List<Action> all() {
        return List.of(
                new Action.NoDecisionYet(),
                new Action.Continue(),
                new Action.AdjustCalories(),
                new Action.IncreaseCalories(),
                new Action.ChangeMovement(),
                new Action.FixTraining(),
                new Action.FixRecovery(),
                new Action.FixAdherence(),
                new Action.HardStop(),
                new Action.StopLoadIncrease(),
                new Action.Deload(),
                new Action.FullRestWeek(),
                new Action.MiniCut());
    }
}
