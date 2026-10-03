package app.keel.coach;

import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Optional;
import java.util.UUID;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** POST /v1/coach/messages (K-505; contract CoachQuestion → CoachAnswer): a question about a call; the coach explains it. */
@RestController
class CoachController {

    record Question(String text, UUID decisionId) {
    }

    /** Contract CoachAnswer. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record AnswerView(Explanation.Mode mode, String text, String copyKey, Explanation.Call call) {
    }

    private final Explanation explanation;
    private final CoachProperties properties;

    CoachController(Explanation explanation, CoachProperties properties) {
        this.explanation = explanation;
        this.properties = properties;
    }

    @PostMapping("/v1/coach/messages")
    AnswerView ask(AccountId account, @RequestBody Question question) {
        if (question == null || question.text() == null || question.text().isBlank() || question.text().length() > properties.maxQuestionChars()) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        Explanation.Answer answer = explanation.answer(account, question.text(), Optional.ofNullable(question.decisionId()))
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        return new AnswerView(answer.mode(), answer.text(), answer.copyKey(), answer.call());
    }
}
