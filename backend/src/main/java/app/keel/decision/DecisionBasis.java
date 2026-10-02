package app.keel.decision;

import app.keel.engine.CheckIn;
import app.keel.engine.DeclaredContext;
import app.keel.engine.Parameters;
import app.keel.engine.Phase;
import app.keel.engine.DecisionPipeline;
import app.keel.engine.WeeklySpine;
import app.keel.engine.Snapshot;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDate;
import java.util.List;

/**
 * What a call read, as the rows "Why this call" shows (K-519, Ö-25, U3's "which data"): from the call's own stored
 * snapshot, nothing else — the decision window's weekly means and the change per week from the first to the latest, when
 * the call read the window; the adherence ratio counted (the counts behind it are not kept); the check-in answers given
 * (one left open is no row); where training stood; a state declared that week. The target is not a row here: it is the
 * plan's (/v1/targets), a single number by exception (U5). The fat estimates the engine read are never here (U4); nor
 * the cycle answer, which is never kept (ADR-020 L-1).
 *
 * @param changeKgPerWeek from the window's first week to its latest, per week; none when the window was not read
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
record DecisionBasis(Phase phase, List<WeekMean> weeks, BigDecimal changeKgPerWeek, BigDecimal adherence, Answers answers,
        StoredSnapshot.Training training, DeclaredContext pausedBy) {

    record WeekMean(LocalDate ends, BigDecimal kg) {
    }

    /** The answers given; one left open is null (not shown). */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Answers(CheckIn.Look look, CheckIn.Training training, CheckIn.Recovery recovery, CheckIn.Waist waist, CheckIn.Appetite appetite) {
    }

    static DecisionBasis of(StoredSnapshot snapshot, Parameters parameters) {
        Snapshot read = snapshot.toSnapshot();
        // A call that stopped before the weekly spine (not enough data yet, a safety stop, a declared week, a gate) read no
        // weekly mean: none is shown as its data. One that read it found a weigh-in in every week (DataSufficiency).
        List<WeekMean> weeks = DecisionPipeline.windowRead(read, parameters)
                ? WeeklySpine.windowMeans(read.weights(), read.today(), parameters).stream()
                        .map(week -> new WeekMean(week.ends(), week.kg().orElseThrow())).toList()
                : List.of();
        StoredSnapshot.Answered answered = snapshot.checkIn();
        return new DecisionBasis(snapshot.phase(), weeks, change(weeks), answered.adherence(),
                new Answers(given(answered.look(), CheckIn.Look.UNKNOWN), given(answered.training(), CheckIn.Training.UNKNOWN),
                        given(answered.recovery(), CheckIn.Recovery.UNKNOWN), given(answered.waist(), CheckIn.Waist.UNKNOWN),
                        given(answered.appetite(), CheckIn.Appetite.UNKNOWN)),
                snapshot.training(), snapshot.context());
    }

    // Kilograms a week from the window's first week to its latest.
    private static BigDecimal change(List<WeekMean> weeks) {
        if (weeks.isEmpty()) {
            return null;
        }
        return weeks.getLast().kg().subtract(weeks.getFirst().kg()).divide(BigDecimal.valueOf(weeks.size() - 1L), MathContext.DECIMAL64);
    }

    private static <T> T given(T answer, T open) {
        return answer == open ? null : answer;
    }
}
