package app.keel.decision;

import app.keel.engine.CheckIn;
import app.keel.engine.CompositionSignal;
import app.keel.engine.DeclaredContext;
import app.keel.engine.Parameters;
import app.keel.engine.Phase;
import app.keel.engine.SourceTag;
import app.keel.engine.DecisionPipeline;
import app.keel.engine.WeeklySpine;
import app.keel.engine.Snapshot;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDate;
import java.util.List;
import java.util.OptionalInt;

/**
 * What a call read, as the rows "Why this call" shows (K-519, Ö-25, U3's "which data"): from the call's own stored
 * snapshot, nothing else — the decision window's weekly means and the change per week from the first to the latest, when
 * the call read the window; the adherence ratio counted, and the counts it is made of when the call kept them (K-526); the
 * check-in answers given (one left open is no row); where training stood; a state declared that week. The target is not
 * a row here: it is the plan's (/v1/targets), a single number by exception (U5). The fat estimates the engine read are
 * never here (U4); nor the cycle answer, which is never kept (ADR-020 L-1).
 *
 * @param changeKgPerWeek from the window's first week to its latest, per week; none when the window was not read
 * @param signals what else the read data says, beside the call and never changing it (K-603: weight steady, waist down);
 *     none when there is nothing
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
record DecisionBasis(Phase phase, List<WeekMean> weeks, BigDecimal changeKgPerWeek, BigDecimal adherence, AdherenceCount adherenceCount,
        Answers answers, StoredSnapshot.Training training, DeclaredContext pausedBy, List<Signal> signals) {

    /** A signal as the contract's Reason: the rule, and only the kind of source it rests on (K-523: the path stays here). */
    record Signal(String rule, Kind source) {
    }

    record Kind(SourceTag tag) {
    }

    /** What the adherence was made of (K-526, ADR-041 #63): kept by calls made since; none for an older one. */
    record AdherenceCount(int done, int planned) {
    }

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
        AdherenceCount count = answered.adherenceDone() == null || answered.adherencePlanned() == null ? null
                : new AdherenceCount(answered.adherenceDone(), answered.adherencePlanned());
        // What else the window says (K-603), only where the call read it: weight steady, waist down.
        List<Signal> signals = CompositionSignal.of(weeks.stream().map(WeekMean::kg).toList(), snapshot.phase(), answered.waist(),
                answered.waistSpanDays() == null ? OptionalInt.empty() : OptionalInt.of(answered.waistSpanDays()), parameters).stream()
                .map(reason -> new Signal(reason.rule().value(), new Kind(reason.source().tag()))).toList();
        return new DecisionBasis(snapshot.phase(), weeks, change(weeks), answered.adherence(), count,
                new Answers(given(answered.look(), CheckIn.Look.UNKNOWN), given(answered.training(), CheckIn.Training.UNKNOWN),
                        given(answered.recovery(), CheckIn.Recovery.UNKNOWN), given(answered.waist(), CheckIn.Waist.UNKNOWN),
                        given(answered.appetite(), CheckIn.Appetite.UNKNOWN)),
                snapshot.training(), snapshot.context(), signals.isEmpty() ? null : signals);
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
