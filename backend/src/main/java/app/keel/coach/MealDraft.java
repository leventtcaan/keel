package app.keel.coach;

import app.keel.nutrition.FoodFinder;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import app.keel.subscription.Quota;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Service;

/**
 * A meal said in words, as a draft to confirm (K-504): the model reads which foods and how much (Purpose PARSE_MEAL — the
 * AI consent must name the meal note); the foods are the database's. Sure when a food holds every word the model gave;
 * otherwise the foods of each word, one tap away (U5), longest word first; none when no food holds any. What a food
 * holds is never the model's (U1): the app asks /v1/food-estimates once the user picks. A reply off its schema, or a day
 * past its limit (K-508), leaves an empty draft — the user searches.
 */
@Service
@EnableConfigurationProperties(MealProperties.class)
class MealDraft {

    enum Mode { MODEL, DETERMINISTIC }

    record Item(String food, BigDecimal grams, boolean confident, List<FoodFinder.FoodMatch> candidates) {
    }

    record Draft(Mode mode, List<Item> items) {
    }

    private final CoachModel model;
    private final Quota quota;
    private final FoodFinder foods;
    private final MealProperties properties;
    private final MealReplyCheck check;
    private final String instructions;

    MealDraft(CoachModel model, Quota quota, FoodFinder foods, MealProperties properties) {
        this.model = model;
        this.quota = quota;
        this.foods = foods;
        this.properties = properties;
        this.check = new MealReplyCheck(Math.min(properties.maxItems(), foods.maxItems()), foods.maxGrams(), properties.maxFoodChars());
        this.instructions = CoachInstructions.read("parse-meal.md");
    }

    Draft read(AccountId account, String words) {
        if (!model.mayAsk(account, Purpose.PARSE_MEAL)) {
            throw new ApiException(ErrorCode.CONSENT_REQUIRED);
        }
        Optional<LocalDate> taken = quota.take(account, Quota.Use.COACH_MESSAGE);
        if (taken.isEmpty()) {
            return new Draft(Mode.DETERMINISTIC, List.of());
        }
        ModelReply reply;
        try {
            reply = model.ask(account, Purpose.PARSE_MEAL, instructions, List.of(Turn.user(words)));
        } catch (RuntimeException notAsked) {
            try {
                quota.giveBack(account, Quota.Use.COACH_MESSAGE, taken.get());
            } catch (RuntimeException alsoFailed) {
                notAsked.addSuppressed(alsoFailed);
            }
            throw notAsked;
        }
        return check.read(reply.text()).map(items -> new Draft(Mode.MODEL, items.stream().map(this::matched).toList()))
                .orElseGet(() -> new Draft(Mode.DETERMINISTIC, List.of()));
    }

    private Item matched(MealReplyCheck.Item item) {
        List<FoodFinder.FoodMatch> every = foods.find(item.food(), properties.candidates());
        if (!every.isEmpty()) {
            return new Item(item.food(), item.grams(), true, every);
        }
        Map<String, FoodFinder.FoodMatch> some = new LinkedHashMap<>();
        Arrays.stream(item.food().split("\\s+")).filter(word -> word.length() > 2).distinct()
                .sorted(Comparator.comparingInt(String::length).reversed())
                .forEach(word -> foods.find(word, properties.candidates()).forEach(food -> {
                    if (some.size() < properties.candidates()) {
                        some.putIfAbsent(food.id(), food);
                    }
                }));
        return new Item(item.food(), item.grams(), false, new ArrayList<>(some.values()));
    }
}
