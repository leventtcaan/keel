package app.keel.decision;

import app.keel.engine.CheckIn;
import app.keel.engine.DeclaredContext;
import app.keel.engine.Parameters;
import app.keel.engine.Phase;
import app.keel.engine.WeighIn;
import app.keel.engine.WeeklySpine;
import app.keel.engine.WeightSeries;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
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
        WeightSeries planned = new WeightSeries(snapshot.weights().stream().filter(weight -> !weight.date().isBefore(snapshot.planStart()))
                .map(weight -> new WeighIn(weight.date(), weight.kg())).toList());
        List<WeekMean> weeks = WeeklySpine.windowMeans(planned, snapshot.today(), parameters).stream()
                .flatMap(week -> week.kg().map(kg -> new WeekMean(week.ends(), kg)).stream()).toList();
        StoredSnapshot.Answered answered = snapshot.checkIn();
        return new DecisionBasis(snapshot.phase(), weeks, change(weeks), answered.adherence(),
                new Answers(given(answered.look(), CheckIn.Look.UNKNOWN), given(answered.training(), CheckIn.Training.UNKNOWN),
                        given(answered.recovery(), CheckIn.Recovery.UNKNOWN), given(answered.waist(), CheckIn.Waist.UNKNOWN),
                        given(answered.appetite(), CheckIn.Appetite.UNKNOWN)),
                snapshot.training(), snapshot.energy() == null ? null : snapshot.energy().targetKcal(), snapshot.context());
    }

    // Kilograms a week from the first week with a weigh-in to the latest, over the weeks between their ends.
    private static BigDecimal change(List<WeekMean> weeks) {
        if (weeks.size() < 2) {
            return null;
        }
        long weeksApart = ChronoUnit.WEEKS.between(weeks.getFirst().ends(), weeks.getLast().ends());
        return weeks.getLast().kg().subtract(weeks.getFirst().kg()).divide(BigDecimal.valueOf(weeksApart), MathContext.DECIMAL64);
    }

    private static <T> T given(T answer, T open) {
        return answer == open ? null : answer;
    }
}
