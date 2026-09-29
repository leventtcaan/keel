package app.keel.engine;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.ParameterizedType;
import java.lang.reflect.RecordComponent;
import java.lang.reflect.Type;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

/**
 * U4: a body-fat percentage is never shown. It enters the engine in the Snapshot and must not leave it: no type
 * reachable from Decision has a component that could carry it. Walks every record reachable from Decision (actions
 * included) and fails on a component named like a fat or percentage value.
 */
class NoFatNumberInOutputTests {

    @Test
    void noDecisionTypeCarriesAFatOrPercentageValue() {
        List<String> offenders = new ArrayList<>();
        for (Class<?> type : reachableFrom(Decision.class)) {
            if (!type.isRecord()) {
                continue; // enums and the sealed interface have no components (getRecordComponents() is null)
            }
            for (RecordComponent component : type.getRecordComponents()) {
                if (component.getName().toLowerCase().matches(".*(fat|pct|percent|bodyfat).*")) {
                    offenders.add(type.getSimpleName() + "." + component.getName());
                }
            }
        }

        assertThat(offenders).isEmpty();
    }

    @Test
    void theEstimateItselfNeverAppearsInADecisionOrInASnapshotPrintout() {
        // Value check, not just names: sentinel estimates that cannot occur by accident.
        java.time.LocalDate today = java.time.LocalDate.of(2026, 10, 26);
        for (Sex sex : Sex.values()) {
            for (Phase phase : Phase.values()) {
                for (String sentinel : List.of("23.4567", "33.4567", "9.4567", "40.4567")) {
                    Snapshot snapshot = new Snapshot(today, sex, phase, today.minusDays(30),
                            new WeightSeries(List.of()), java.util.Optional.of(new java.math.BigDecimal(sentinel)));
                    String digits = sentinel.substring(0, sentinel.indexOf('.') + 3);

                    PhaseGate.check(snapshot, EngineFixtures.parameters(sex)).ifPresent(decision ->
                            assertThat(decision.toString()).doesNotContain(digits));
                    assertThat(snapshot.toString()).as("Snapshot.toString, in case it is ever logged").doesNotContain(digits);
                }
            }
        }
    }

    @Test
    @SuppressWarnings("unchecked")
    void noDecisionTextStatesAPercentage() {
        java.util.Map<String, Object> decision = (java.util.Map<String, Object>) EngineFixtures.copyTree().get("decision");
        List<String> texts = new ArrayList<>();
        collectStrings(decision, texts);

        assertThat(texts).isNotEmpty().noneMatch(text -> text.matches("(?is).*(\\d\\s*%|percent).*"));
    }

    @SuppressWarnings("unchecked")
    private static void collectStrings(Object node, List<String> into) {
        if (node instanceof String text) {
            into.add(text);
        } else if (node instanceof java.util.Map<?, ?> map) {
            map.values().forEach(value -> collectStrings(value, into));
        }
    }

    @Test
    void theWalkReallySeesTheActionsAndTheSnapshotFieldWouldBeCaught() {
        // Guards the guard: the walk reaches the action records, and the same name check flags Snapshot's own field.
        assertThat(reachableFrom(Decision.class)).contains(Action.ChangePhase.class, Reason.class, Source.class);
        assertThat(List.of(Snapshot.class.getRecordComponents()))
                .anyMatch(component -> component.getName().toLowerCase().matches(".*(fat|pct|percent|bodyfat).*"));
    }

    private static Set<Class<?>> reachableFrom(Class<?> root) {
        Set<Class<?>> seen = new HashSet<>();
        Deque<Class<?>> todo = new ArrayDeque<>(List.of(root));
        while (!todo.isEmpty()) {
            Class<?> type = todo.pop();
            if (!type.getPackageName().equals("app.keel.engine") || !seen.add(type)) {
                continue;
            }
            if (type.isSealed()) {
                todo.addAll(List.of(type.getPermittedSubclasses()));
            }
            if (type.isRecord()) {
                for (RecordComponent component : type.getRecordComponents()) {
                    todo.add(component.getType());
                    addTypeArguments(component.getGenericType(), todo);
                }
            }
        }
        return seen;
    }

    private static void addTypeArguments(Type type, Deque<Class<?>> todo) {
        if (type instanceof ParameterizedType parameterized) {
            for (Type argument : parameterized.getActualTypeArguments()) {
                if (argument instanceof Class<?> c) {
                    todo.add(c);
                }
                addTypeArguments(argument, todo);
            }
        }
    }
}
