package app.keel.decision;

import app.keel.engine.ActionTally;
import app.keel.engine.WeekTally;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** The contract's check-in answers and call ledger (K-212): /v1/check-ins/current/answers, /v1/decisions/*. */
@RestController
class DecisionController {

    record CheckInAnswers(UUID clientId, LocalDate weekOf, List<Answers.Answer> answers) {
    }

    /** Contract DecisionPage. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record DecisionPage(List<Map<String, Object>> items, String next) {
    }

    private static final int DEFAULT_PAGE = 20;
    private static final int MAX_PAGE = 100;

    private final DecisionService decisions;

    DecisionController(DecisionService decisions) {
        this.decisions = decisions;
    }

    @GetMapping("/v1/check-ins/current")
    DecisionService.CheckInView checkIn(AccountId account) {
        return decisions.currentCheckIn(account);
    }

    @PostMapping("/v1/check-ins/current/answers")
    Map<String, Object> answer(AccountId account, @RequestBody CheckInAnswers answers) {
        require(answers.clientId() != null && answers.weekOf() != null && answers.answers() != null);
        return view(decisions.checkIn(account, answers.clientId(), answers.weekOf(), answers.answers()));
    }

    @GetMapping("/v1/decisions")
    DecisionPage ledger(AccountId account, @RequestParam(required = false) Integer limit, @RequestParam(required = false) UUID before) {
        int size = limit == null ? DEFAULT_PAGE : limit;
        require(size >= 1 && size <= MAX_PAGE);
        // One more than asked tells whether an older page exists.
        List<CallStore.Call> page = decisions.page(account, Optional.ofNullable(before), size + 1);
        List<CallStore.Call> shown = page.subList(0, Math.min(size, page.size()));
        return new DecisionPage(shown.stream().map(DecisionController::view).toList(),
                page.size() > size ? shown.getLast().id().toString() : null);
    }

    @GetMapping("/v1/decisions/current")
    Map<String, Object> current(AccountId account) {
        return view(decisions.current(account).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND)));
    }

    @GetMapping("/v1/decisions/{id}")
    Map<String, Object> call(AccountId account, @PathVariable UUID id) {
        return view(decisions.find(account, id).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND)));
    }

    /** Contract DecisionBasis (K-519): the rows "Why this call" shows — health data, behind the consent like the call. */
    @GetMapping("/v1/decisions/{id}/basis")
    DecisionBasis basis(AccountId account, @PathVariable UUID id) {
        return decisions.basis(account, id).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
    }

    @PostMapping("/v1/decisions/{id}/apply")
    PlanTargets apply(AccountId account, @PathVariable UUID id) {
        return decisions.apply(account, id);
    }

    @PostMapping("/v1/decisions/{id}/undo")
    PlanTargets undo(AccountId account, @PathVariable UUID id) {
        return decisions.undo(account, id);
    }

    /** Contract Consistency (K-420): this week's four kinds of planned action, and the weeks on track. */
    @GetMapping("/v1/consistency")
    Map<String, Object> consistency(AccountId account) {
        WeekLogs.Now now = decisions.consistency(account);
        WeekTally week = now.week();
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("weekOf", week.weekStart());
        view.put("training", count(week.training()));
        view.put("protein", count(week.protein()));
        view.put("steps", count(week.steps()));
        view.put("weighIns", count(week.weighIns()));
        view.put("planned", week.planned());
        view.put("done", week.done());
        WeekTallies.percent(week).ifPresent(percent -> view.put("percent", percent));
        if (week.paused()) {
            view.put("paused", true); // a state declared this week (K-516): neither on track nor missed
        }
        view.put("record", Map.of("onTrackWeeks", now.record().onTrackWeeks(), "countedWeeks", now.record().countedWeeks(),
                "currentRun", now.record().currentRun()));
        return view;
    }

    // Done counted up to the plan, as the week's total (K-111).
    private static Map<String, Integer> count(ActionTally tally) {
        return Map.of("planned", tally.planned(), "done", tally.counted());
    }

    @GetMapping("/v1/targets")
    PlanTargets targets(AccountId account) {
        return decisions.targets(account);
    }

    /** Contract Decision: the id and the day, the engine's decision field for field, and whether and when it was applied. */
    static Map<String, Object> view(CallStore.Call call) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("id", call.id());
        view.put("madeOn", call.madeOn());
        view.putAll(call.decision());
        Map<String, Object> application = new LinkedHashMap<>();
        application.put("state", call.application().name());
        if (call.appliedAt() != null) {
            application.put("appliedAt", call.appliedAt());
        }
        if (call.undoneAt() != null) {
            application.put("undoneAt", call.undoneAt());
        }
        view.put("application", application);
        return view;
    }

    private static void require(boolean valid) {
        if (!valid) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
    }
}
