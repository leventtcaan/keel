package app.keel.decision;

import app.keel.engine.Action;
import app.keel.engine.ActionType;
import app.keel.engine.Decision;
import app.keel.engine.Phase;
import app.keel.shared.Decimals;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.RecordComponent;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * A call as the contract writes it (K-212; contract Decision, ContractTests): the engine's Decision field for field,
 * the Action with its kind in {@code type} and its record components as its data. Read from the record itself, so a new
 * Action or field cannot be left out by hand.
 */
final class DecisionJson {

    private DecisionJson() {
    }

    static Map<String, Object> of(Decision decision) {
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("action", action(decision.action()));
        json.put("reasons", decision.reasons().stream().map(reason -> Map.of("rule", reason.rule().value(),
                "source", Map.of("reference", reason.source().reference(), "tag", reason.source().tag().name()))).toList());
        json.put("confidence", decision.confidence().name());
        json.put("nextReview", decision.nextReview().toString());
        json.put("copyKey", decision.copyKey().value());
        return json;
    }

    /** The Action of a kept call ({@link #of}'s "action"), as the engine made it. */
    @SuppressWarnings("unchecked")
    static Action action(Map<String, Object> call) {
        Map<String, Object> action = (Map<String, Object>) call.get("action");
        return switch (ActionType.valueOf((String) action.get("type"))) {
            case NO_DECISION_YET -> new Action.NoDecisionYet();
            case CONTINUE -> new Action.Continue();
            case ADJUST_CALORIES -> new Action.AdjustCalories(whole(action, "kcalPerDay"));
            case INCREASE_CALORIES -> new Action.IncreaseCalories(whole(action, "kcalPerDay"));
            case CHANGE_MOVEMENT -> new Action.ChangeMovement();
            case FIX_TRAINING -> new Action.FixTraining();
            case FIX_RECOVERY -> new Action.FixRecovery();
            case FIX_ADHERENCE -> new Action.FixAdherence();
            case HARD_STOP -> new Action.HardStop();
            case STOP_LOAD_INCREASE -> new Action.StopLoadIncrease();
            case DELOAD -> new Action.Deload(new BigDecimal(action.get("setsFactor").toString()));
            case FULL_REST_WEEK -> new Action.FullRestWeek();
            case MINI_CUT -> new Action.MiniCut(whole(action, "minWeeks"), whole(action, "maxWeeks"));
            case CHANGE_PHASE -> new Action.ChangePhase(Phase.valueOf((String) action.get("to")));
        };
    }

    private static int whole(Map<String, Object> action, String field) {
        return ((Number) action.get(field)).intValue();
    }

    private static Map<String, Object> action(Action action) {
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("type", action.type().name());
        for (RecordComponent component : action.getClass().getRecordComponents()) {
            json.put(component.getName(), value(read(component, action)));
        }
        return json;
    }

    private static Object read(RecordComponent component, Action action) {
        try {
            return component.getAccessor().invoke(action);
        } catch (IllegalAccessException | InvocationTargetException unreadable) {
            throw new IllegalStateException("Cannot read " + action.type() + "." + component.getName(), unreadable);
        }
    }

    private static Object value(Object raw) {
        return switch (raw) {
            case Enum<?> constant -> constant.name();
            case BigDecimal decimal -> Decimals.plain(decimal);
            default -> raw;
        };
    }
}
