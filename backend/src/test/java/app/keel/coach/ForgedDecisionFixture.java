package app.keel.coach;

import app.keel.engine.Action;
import app.keel.engine.Confidence;
import app.keel.engine.CopyKey;
import app.keel.engine.Decision;
import app.keel.engine.Reason;
import app.keel.engine.RuleId;
import app.keel.engine.Source;
import app.keel.engine.SourceTag;
import java.time.LocalDate;
import java.util.List;

/**
 * Test-only and never run: a coach that makes up its own decision. DecisionOwnershipTests imports its bytecode to show
 * the rule really fails on such code (the same pattern as ImpureEngineFixture).
 */
public final class ForgedDecisionFixture {

    private ForgedDecisionFixture() {
    }

    public static Decision madeUp() {
        return new Decision(new Action.Continue(), List.of(new Reason(new RuleId("llm_said_so"),
                new Source("arastirma/03-guray-karar-omurgasi.md#2.4", SourceTag.EXPERIENCE))),
                Confidence.HIGH, LocalDate.of(2026, 11, 2), new CopyKey("decision.continue.toward_goal"));
    }
}
