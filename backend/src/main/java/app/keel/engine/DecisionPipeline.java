package app.keel.engine;

import java.util.List;

/** The assembled engine (K-112). */
public final class DecisionPipeline {

    private DecisionPipeline() {
    }

    public static Decision decide(Snapshot snapshot, Parameters parameters) {
        return new Decision(new Action.NoDecisionYet(), List.of(new Reason(new RuleId("not_implemented"),
                new Source("arastirma/03-guray-karar-omurgasi.md#2.4", SourceTag.EXPERIENCE))), Confidence.LOW,
                snapshot.today(), new CopyKey("decision.not_implemented"));
    }
}
