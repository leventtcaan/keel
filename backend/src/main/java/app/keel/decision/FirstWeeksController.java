package app.keel.decision;

import app.keel.engine.CopyKey;
import app.keel.engine.FirstWeeks;
import app.keel.engine.WeighInWeek;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.LocalDate;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The first eight weeks (K-513, ADR-040): /v1/first-weeks — this week of the flow, its words and the risk's signals, and
 * the first call's day until it is made (K-990), and this week's weigh-ins until a call has read the scale (ADR-089). NOT_FOUND once the flow is over. Health data (sessions, food, the forgiven week): behind the HEALTH_DATA consent.
 */
@RestController
class FirstWeeksController {

    /** Contract FirstWeeks. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record FirstWeeksView(int week, String contentKey, List<SignalView> risk, boolean readsRisk, boolean training, LocalDate firstCallOn,
            WeighInWeekView weighInWeek) {
    }

    /** Contract WeighInWeek (ADR-089): the block ending on the next call's day and the days of it with a weigh-in. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record WeighInWeekView(LocalDate from, LocalDate to, List<LocalDate> weighedDays, int needed, LocalDate callsFrom) {

        static WeighInWeekView of(WeighInWeek week) {
            return new WeighInWeekView(week.from(), week.to(), week.weighedDays(), week.needed(), week.callsFrom().orElse(null));
        }
    }

    /** Contract Reason: a signal's rule and its source. */
    record SignalView(String rule, SourceView source) {
    }

    private final DecisionService decisions;

    FirstWeeksController(DecisionService decisions) {
        this.decisions = decisions;
    }

    @GetMapping("/v1/first-weeks")
    FirstWeeksView thisWeek(AccountId account) {
        FirstWeeks.Week week = decisions.firstWeeks(account).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        return new FirstWeeksView(week.number(), week.content().map(CopyKey::value).orElse(null),
                week.risk().stream().map(signal -> new SignalView(signal.rule().value(), SourceView.of(signal.source()))).toList(), week.readsRisk(),
                week.training(), decisions.firstCallOn(account).orElse(null), decisions.weighInWeek(account).map(WeighInWeekView::of).orElse(null));
    }
}
