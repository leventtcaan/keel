package app.keel.decision;

import app.keel.engine.CopyKey;
import app.keel.engine.FirstWeeks;
import app.keel.engine.Source;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The first eight weeks (K-513, ADR-040): /v1/first-weeks — this week of the flow, its words and the risk's signals.
 * NOT_FOUND once the flow is over. Health data (sessions, food, the forgiven week): behind the HEALTH_DATA consent.
 */
@RestController
class FirstWeeksController {

    /** Contract FirstWeeks. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record FirstWeeksView(int week, String contentKey, List<SignalView> risk) {
    }

    /** Contract Reason: a signal's rule and its source. */
    record SignalView(String rule, Source source) {
    }

    private final DecisionService decisions;

    FirstWeeksController(DecisionService decisions) {
        this.decisions = decisions;
    }

    @GetMapping("/v1/first-weeks")
    FirstWeeksView thisWeek(AccountId account) {
        FirstWeeks.Week week = decisions.firstWeeks(account).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        return new FirstWeeksView(week.number(), week.content().map(CopyKey::value).orElse(null),
                week.risk().stream().map(signal -> new SignalView(signal.rule().value(), signal.source())).toList());
    }
}
