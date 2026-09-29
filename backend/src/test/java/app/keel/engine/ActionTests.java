package app.keel.engine;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

/** The action vocabulary is closed: every action kind has exactly one Action type and every Action type one kind. */
class ActionTests {

    @Test
    void everyActionTypeHasExactlyOneAction() {
        List<ActionType> typesOfAllActions = Actions.all().stream().map(Action::type).toList();

        assertThat(typesOfAllActions).containsExactlyInAnyOrder(ActionType.values());
    }

    @Test
    void theExampleListCoversEveryPermittedAction() {
        List<Class<?>> exampleClasses = Actions.all().stream().<Class<?>>map(Object::getClass).toList();

        assertThat(exampleClasses).containsExactlyInAnyOrder(Action.class.getPermittedSubclasses());
    }

    @Test
    void eachActionMapsToTheTypeWithItsOwnName() {
        // Catches two actions swapping types (still a valid one-to-one mapping, but the wrong copy and history).
        for (Action action : Actions.all()) {
            String upperSnake = action.getClass().getSimpleName().replaceAll("([a-z])([A-Z])", "$1_$2").toUpperCase();

            assertThat(action.type().name()).as(action.getClass().getSimpleName()).isEqualTo(upperSnake);
        }
    }

    @Test
    void noDecisionYetIsAnAction() {
        assertThat(Arrays.asList(ActionType.values())).contains(ActionType.NO_DECISION_YET);
        assertThat(new Action.NoDecisionYet().type()).isEqualTo(ActionType.NO_DECISION_YET);
    }
}
