package app.keel.decision;

import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/**
 * Each reason's facts (K-1000, ADR-077 #3 "two reasons: the data and the rule"; contract ReasonFacts): the numbers its
 * rule read, from the call's own kept data, nothing else (the basis, K-519; the first week, K-962; the action). The app
 * writes them into the rule's short line (decision.ruleShort.&lt;rule&gt;); the server says the numbers, never the words.
 * A rule with nothing of its own to count, or a call kept before a number was kept, has none (none is made up).
 */
final class ReasonFacts {

    private ReasonFacts() {
    }

    // The rules that read the decision window: its change a week and how many weeks.
    private static final Set<String> WINDOW = Set.of("toward_goal", "not_toward_goal", "stall_window", "bulk_stall", "wait_one_more_week",
            "genetic_limit", "rapid_loss", "loss_rate_cap", "weight_steady_waist_down");
    // The rules that read how much of the plan happened (K-526's counts).
    private static final Set<String> ADHERENCE = Set.of("adherence_low", "adherence_partial");
    // The first week's (K-962): the sessions done of the planned.
    private static final Set<String> FIRST_WEEK = Set.of("first_week_on_track", "first_week_add_day", "first_week_move_missed");
    // The rules on the most-stalled lift (K-110): the sessions it stalled.
    private static final Set<String> STALLED = Set.of("plateau", "performance_red_flag");
    // A calorie step's size (its action's).
    private static final Set<String> STEP = Set.of("cut_step", "bulk_step", "rapid_loss", "loss_rate_cap");

    /**
     * The fact names a rule can carry, whatever a call kept: the placeholders its short line may use
     * (decision.ruleShort.&lt;rule&gt;). {@link #of} gives exactly these when the call kept all it read.
     */
    static Set<String> keysOf(String rule) {
        Set<String> keys = new TreeSet<>();
        if (WINDOW.contains(rule)) {
            keys.addAll(Set.of("kgPerWeek", "weeks"));
        }
        if (ADHERENCE.contains(rule) || FIRST_WEEK.contains(rule)) {
            keys.addAll(Set.of("done", "planned"));
        }
        if (STALLED.contains(rule)) {
            keys.add("sessions");
        }
        if (rule.equals("load_held_still_stalled") || rule.equals("plan_missed")) {
            keys.add("weeks");
        }
        if (STEP.contains(rule)) {
            keys.add("kcal");
        }
        return Set.copyOf(keys);
    }

    static Map<String, Object> of(String rule, DecisionBasis basis, StoredSnapshot.FirstWeek firstWeek, Map<String, Object> call) {
        Map<String, Object> facts = new LinkedHashMap<>();
        if (WINDOW.contains(rule) && basis.changeKgPerWeek() != null && !basis.weeks().isEmpty()) {
            // Rounded once, to a tenth, here (ADR-029: the phone rounds no weight again).
            facts.put("kgPerWeek", basis.changeKgPerWeek().setScale(1, RoundingMode.HALF_UP));
            facts.put("weeks", basis.weeks().size());
        }
        if (ADHERENCE.contains(rule) && basis.adherenceCount() != null) {
            facts.put("done", basis.adherenceCount().done());
            facts.put("planned", basis.adherenceCount().planned());
        }
        if (FIRST_WEEK.contains(rule) && firstWeek != null) {
            facts.put("done", firstWeek.done());
            facts.put("planned", firstWeek.planned());
        }
        StoredSnapshot.Training training = basis.training();
        if (training != null) {
            if (STALLED.contains(rule)) {
                facts.put("sessions", training.stalledSessions());
            } else if (rule.equals("load_held_still_stalled")) {
                facts.put("weeks", training.weeksLoadHeld());
            } else if (rule.equals("plan_missed")) {
                facts.put("weeks", training.weeksPlanMissed());
            }
        }
        Object action = call.get("action");
        if (STEP.contains(rule) && action instanceof Map<?, ?> made && made.get("kcalPerDay") instanceof Number kcal) {
            facts.put("kcal", Math.abs(kcal.intValue()));
        }
        return Map.copyOf(facts);
    }
}
