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

/** The coach (K-505, K-504): a question about a call, explained; a meal in words, read into a draft. */
@RestController
class CoachController {

    record Question(String text, UUID decisionId) {
    }

    /** Contract CoachAnswer. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record AnswerView(Explanation.Mode mode, Topic topic, String rule, String copyKey, Explanation.Call call) {
    }

    record MealWords(String text) {
    }

    private final Explanation explanation;
    private final MealDraft meals;
    private final CoachProperties properties;
    private final MealProperties mealProperties;

    CoachController(Explanation explanation, MealDraft meals, CoachProperties properties, MealProperties mealProperties) {
        this.explanation = explanation;
        this.meals = meals;
        this.properties = properties;
        this.mealProperties = mealProperties;
    }

    /** POST /v1/meals/parse (K-504; contract MealWords → MealDraft): a meal in words, as a draft of the database's foods. */
    @PostMapping("/v1/meals/parse")
    MealDraft.Draft parse(AccountId account, @RequestBody MealWords words) {
        if (words == null || words.text() == null || words.text().isBlank() || words.text().length() > mealProperties.maxTextChars()) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        return meals.read(account, words.text());
    }

    @PostMapping("/v1/coach/messages")
    AnswerView ask(AccountId account, @RequestBody Question question) {
        if (question == null || question.text() == null || question.text().isBlank() || question.text().length() > properties.maxQuestionChars()) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        Explanation.Answer answer = explanation.answer(account, question.text(), Optional.ofNullable(question.decisionId()))
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND));
        return new AnswerView(answer.mode(), answer.topic(), answer.rule(), answer.copyKey(), answer.call());
    }
}
