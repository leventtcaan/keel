package app.keel.decision;

import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import app.keel.training.ReturnAnswers;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * Coming back after a gap (K-1020, ADR-077 #5 and Ek 8): /v1/return — the gap, whether to ask, what to offer and the next
 * call's day; the answer, once per gap. It never changes a call (U2): PICK_UP only keeps the program's targets as they were.
 */
@RestController
class ReturnController {

    /** Contract ReturnAnswer. */
    record Answer(ReturnAnswers.Choice choice) {
    }

    private final ReturnService returns;

    ReturnController(ReturnService returns) {
        this.returns = returns;
    }

    @GetMapping("/v1/return")
    ReturnService.View summary(AccountId account) {
        return returns.summary(account);
    }

    @PostMapping("/v1/return")
    ReturnService.View answer(AccountId account, @RequestBody Answer answer) {
        if (answer.choice() == null) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        return returns.answer(account, answer.choice());
    }
}
