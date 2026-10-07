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
 *
 * <p>One exception, at this edge only (K-228, ADR-028 #24): the hard stop follows nothing but a "yes" to the cycle
 * question, so its own kind would keep that answer (GDPR Art. 9). It is kept, shown and exported as what it does to the
 * plan — a change of phase to building — marked {@code safety}, under the change-of-phase words; read back, the mark
 * makes it the hard stop again. The engine's ActionType is unchanged.
 */
final class DecisionJson {

    private DecisionJson() {
    }

    private static final String HARD_STOP_WORDS = "decision.hard_stop.";
    private static final String PHASE_WORDS = "decision.change_phase.";
    private static final String SAFETY = "safety";

    static Map<String, Object> of(Decision decision) {
        boolean hardStop = decision.action() instanceof Action.HardStop;
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("action", hardStop ? action(new Action.ChangePhase(Phase.BULK)) : action(decision.action()));
        json.put("reasons", decision.reasons().stream().map(reason -> Map.of("rule", reason.rule().value(),
                "source", Map.of("reference", reason.source().reference(), "tag", reason.source().tag().name()))).toList());
        json.put("confidence", decision.confidence().name());
        json.put("nextReview", decision.nextReview().toString());
        json.put("copyKey", hardStop ? decision.copyKey().value().replace(HARD_STOP_WORDS, PHASE_WORDS) : decision.copyKey().value());
        if (hardStop) {
            json.put(SAFETY, true);
        }
        return json;
    }

    /** Whether a kept call is the hard stop, kept as its change of phase with the safety mark. */
    static boolean safety(Map<String, Object> call) {
        return Boolean.TRUE.equals(call.get(SAFETY));
    }

    /** The Action of a kept call ({@link #of}'s "action"), as the engine made it. */
    @SuppressWarnings("unchecked")
    static Action action(Map<String, Object> call) {
        Map<String, Object> action = (Map<String, Object>) call.get("action");
        if (safety(call)) {
            return new Action.HardStop(); // kept as its change of phase (see the class note)
        }
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
