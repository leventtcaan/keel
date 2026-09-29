package app.keel.engine;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Double progression (K-109, H3 B4): add reps within the range; when every set reaches the top, add the smallest
 * load step for the body region (load_increment_upper_kg / load_increment_lower_kg) and climb again from the bottom.
 *
 * <p>Güray's gates come first: isolation lifts are not load-tracked (G6 K-33, load_progression_compound_only), and no
 * load goes on unless the current load moved with perfect form that week (G6 K-31, technique_gate_required). Work
 * sets end at RIR 0 to target_rir_max (G1 K-5); sets left further from failure get a note to go closer.
 *
 * <p>H3 B4 is honest that double progression is not proven better than other schemes; it is used because it is the
 * easiest to follow and to explain.
 */
public record Progression(ProgressionStep step, List<Reason> reasons) {

    static final RuleId DOUBLE_PROGRESSION = new RuleId("double_progression");
    static final RuleId TECHNIQUE_GATE = new RuleId("technique_gate");
    static final RuleId ISOLATION_NOT_TRACKED = new RuleId("isolation_not_tracked");
    static final RuleId CLOSER_TO_FAILURE = new RuleId("closer_to_failure");

    private static final Source DOUBLE_PROGRESSION_SOURCE = new Source("arastirma/ham/H3-bosluk-literatur.md#B4", SourceTag.LITERATURE);
    private static final Source TECHNIQUE_SOURCE = new Source("arastirma/ham/guray/G6-eski-arsiv.md#K-31", SourceTag.EXPERIENCE);
    private static final Source ISOLATION_SOURCE = new Source("arastirma/ham/guray/G6-eski-arsiv.md#K-33", SourceTag.EXPERIENCE);
    private static final Source RIR_SOURCE = new Source("arastirma/ham/guray/G1-antrenman.md#K-5", SourceTag.EXPERIENCE);

    public Progression {
        Objects.requireNonNull(step, "step");
        Objects.requireNonNull(reasons, "reasons");
        reasons = List.copyOf(reasons);
    }

    public static Progression next(LiftSession session, Parameters parameters) {
        if (session.kind() == LiftKind.ISOLATION && parameters.flag(ParameterKey.LOAD_PROGRESSION_COMPOUND_ONLY)) {
            return new Progression(new ProgressionStep.NotTracked(), List.of(new Reason(ISOLATION_NOT_TRACKED, ISOLATION_SOURCE)));
        }
        boolean allAtTop = session.sets().stream().allMatch(set -> set.reps() >= session.range().max());
        if (allAtTop && !session.techniqueClean() && parameters.flag(ParameterKey.TECHNIQUE_GATE_REQUIRED)) {
            return new Progression(new ProgressionStep.Hold(), List.of(new Reason(TECHNIQUE_GATE, TECHNIQUE_SOURCE)));
        }
        if (allAtTop) {
            ParameterKey stepKey = session.region() == BodyRegion.UPPER
                    ? ParameterKey.LOAD_INCREMENT_UPPER_KG : ParameterKey.LOAD_INCREMENT_LOWER_KG;
            BigDecimal newLoad = session.loadKg().add(BigDecimal.valueOf(parameters.number(stepKey)));
            return new Progression(new ProgressionStep.AddLoad(newLoad, session.range().min()),
                    List.of(new Reason(DOUBLE_PROGRESSION, DOUBLE_PROGRESSION_SOURCE)));
        }
        List<Reason> reasons = new ArrayList<>(List.of(new Reason(DOUBLE_PROGRESSION, DOUBLE_PROGRESSION_SOURCE)));
        int targetRir = parameters.wholeNumber(ParameterKey.TARGET_RIR_MAX);
        if (session.sets().stream().anyMatch(set -> set.rir() > targetRir)) {
            reasons.add(new Reason(CLOSER_TO_FAILURE, RIR_SOURCE));
        }
        return new Progression(new ProgressionStep.AddReps(), reasons);
    }
}
