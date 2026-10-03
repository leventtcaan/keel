package app.keel.coach;

import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

/** The coach (K-505, K-504, K-514): a question about a call, explained; a meal in words or in a photo, read into a draft. */
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

    private static final JsonMapper JSON = JsonMapper.builder().build();

    private final Explanation explanation;
    private final MealDraft meals;
    private final CoachProperties properties;
    private final MealProperties mealProperties;
    private final PhotoProperties photoProperties;
    private final MealPhoto photo;

    CoachController(Explanation explanation, MealDraft meals, CoachProperties properties, MealProperties mealProperties, PhotoProperties photoProperties) {
        this.explanation = explanation;
        this.meals = meals;
        this.properties = properties;
        this.mealProperties = mealProperties;
        this.photoProperties = photoProperties;
        this.photo = photoProperties.photo();
    }

    /**
     * POST /v1/meals/photo (K-514; contract MealPhoto → MealDraft): a meal photo — a JPEG or a PNG of at most 1024 px a
     * side, in base64 — as a draft of the database's foods with grams by eye. Read up to the longest a photo can be and
     * no further (413), so an endless body is never held; the photo is checked and cleaned before anything is counted or
     * sent, and is kept nowhere.
     */
    @PostMapping(value = "/v1/meals/photo", consumes = MediaType.APPLICATION_JSON_VALUE)
    MealDraft.Draft photo(AccountId account, HttpServletRequest request) throws IOException {
        int limit = photoProperties.maxBody();
        if (request.getContentLengthLong() > limit) {
            throw new ApiException(ErrorCode.PAYLOAD_TOO_LARGE);
        }
        byte[] body = request.getInputStream().readNBytes(limit + 1);
        if (body.length > limit) {
            throw new ApiException(ErrorCode.PAYLOAD_TOO_LARGE);
        }
        byte[] image;
        try {
            if (!(JSON.readValue(body, Object.class) instanceof Map<?, ?> sent) || !(sent.get("image") instanceof String base64)) {
                throw new ApiException(ErrorCode.VALIDATION_FAILED);
            }
            image = Base64.getDecoder().decode(base64);
        } catch (JacksonException | IllegalArgumentException notAPhoto) {
            throw new ApiException(ErrorCode.VALIDATION_FAILED);
        }
        Picture cleaned = photo.clean(image).orElseThrow(() -> new ApiException(ErrorCode.VALIDATION_FAILED));
        return meals.readPhoto(account, cleaned);
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
