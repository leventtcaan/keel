package app.keel.decision;

import app.keel.engine.CheckIn;
import app.keel.engine.DeclaredContext;
import app.keel.engine.Parameters;
import app.keel.engine.Phase;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * What a call read, as the rows "Why this call" shows (K-519, Ö-25, U3's "which data"): from the call's own stored
 * snapshot, nothing else — the decision window's weekly means and the change per week between the first and the latest
 * of them, the adherence counted, the check-in answers given (one left open is no row), where training stood, the
 * target, a state declared that week. Weigh-ins from before the plan began are not its data. The fat estimates the
 * engine read are never here (U4); nor the cycle answer, which is never kept (ADR-020 L-1).
 *
 * @param changeKgPerWeek between the first and the latest week with a weigh-in, per week; none with fewer than two
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
record DecisionBasis(Phase phase, List<WeekMean> weeks, BigDecimal changeKgPerWeek, BigDecimal adherence, Answers answers,
        StoredSnapshot.Training training, Integer targetKcal, DeclaredContext pausedBy) {

    record WeekMean(LocalDate ends, BigDecimal kg) {
    }

    /** The answers given; one left open is null (not shown). */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Answers(CheckIn.Look look, CheckIn.Training training, CheckIn.Recovery recovery, CheckIn.Waist waist, CheckIn.Appetite appetite) {
    }

    static DecisionBasis of(StoredSnapshot snapshot, Parameters parameters) {
        return new DecisionBasis(snapshot.phase(), List.of(), null, null, new Answers(null, null, null, null, null), null, null, null);
    }
}
