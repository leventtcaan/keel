package app.keel.coach;

import app.keel.nutrition.FoodFinder;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import app.keel.subscription.Quota;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Service;

/**
 * A meal said in words, as a draft to confirm (K-504): the model reads which foods and how much, in the user's own measure
 * (Purpose PARSE_MEAL — the AI consent must name the meal note; a meal is health data, so that consent too). A meal photo
 * (K-514, Purpose PHOTO_MEAL — the consent must name the meal photo) is read the same way, the amount in grams by eye:
 * an estimate ({@code certainty} ESTIMATED), so the database's range is wide and its gram question is asked (U5). The foods
 * are the database's; what they hold is never the model's (U1), nor is a measure turned into grams by it (ADR-004): the
 * app sends the amount as it is to /v1/food-estimates with the food the user picks.
 *
 * <p>Sure ({@code confident}) when a food's name holds every word of the item as a whole word ("egg" is not "Eggnog");
 * those come first. Otherwise the foods of each word, one tap away (U5), taken in turn across the words in the model's
 * order, at most {@code candidates}; none when no food holds any. A reply off its schema, or a day past its limit
 * (K-508; a photo counts against the day's photo analyses), leaves an empty DETERMINISTIC draft — the user searches.
 */
@Service
@EnableConfigurationProperties({MealProperties.class, PhotoProperties.class})
class MealDraft {

    enum Mode { MODEL, DETERMINISTIC }

    /** How sure an amount is, as the contract's Amount.certainty: a photo's grams are by eye. */
    enum Certainty { ESTIMATED }

    /**
     * How much, as the contract's Amount: a quantity in g, ml or the user's measure (a serving of the food picked); a
     * certainty only for a photo's grams by eye.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    record Amount(BigDecimal quantity, String unit, Certainty certainty) {
    }

    record Item(String food, Amount amount, boolean confident, List<FoodFinder.FoodMatch> candidates) {
    }

    record Draft(Mode mode, List<Item> items) {
    }

    private final CoachModel model;
    private final Quota quota;
    private final FoodFinder foods;
    private final MealProperties properties;
    private final MealReplyCheck check;
    private final MealReplyCheck photoCheck;
    private final Set<String> stopWords;
    private final String instructions;
    private final String photoInstructions;

    private final MealPhoto photo;

    MealDraft(CoachModel model, Quota quota, FoodFinder foods, MealProperties properties, PhotoProperties photoProperties) {
        this.model = model;
        this.quota = quota;
        this.foods = foods;
        this.properties = properties;
        int maxItems = Math.min(properties.maxItems(), foods.maxItems());
        ForbiddenWords forbidden = ForbiddenWords.fromClasspath();
        this.check = new MealReplyCheck(maxItems, foods.maxGrams(), properties.maxFoodChars(), forbidden);
        this.photoCheck = MealReplyCheck.grams(maxItems, foods.maxGrams(), properties.maxFoodChars(), forbidden);
        this.stopWords = properties.stopWords().stream().map(word -> word.toLowerCase(Locale.ROOT)).collect(Collectors.toUnmodifiableSet());
        this.instructions = CoachInstructions.read("parse-meal.md");
        this.photoInstructions = CoachInstructions.read("photo-meal.md");
        this.photo = photoProperties.photo();
    }

    Draft read(AccountId account, String words) {
        return draft(account, Purpose.PARSE_MEAL, Quota.Use.COACH_MESSAGE, instructions, () -> Turn.user(words), check, null);
    }

    /**
     * A meal photo as it came (K-514): looked at only once both consents are there — then checked and cleaned (MealPhoto;
     * VALIDATION_FAILED for anything else, before anything is counted) — the foods seen, with grams by eye.
     */
    Draft readPhoto(AccountId account, byte[] image) {
        return draft(account, Purpose.PHOTO_MEAL, Quota.Use.PHOTO_ANALYSIS, photoInstructions,
                () -> Turn.userWithPicture("", photo.clean(image).orElseThrow(() -> new ApiException(ErrorCode.VALIDATION_FAILED))), photoCheck,
                Certainty.ESTIMATED);
    }

    /** The consents, then what is sent ({@code sent}, which may refuse it), then the day's use, then the model. */
    private Draft draft(AccountId account, Purpose purpose, Quota.Use use, String system, Supplier<Turn> sent, MealReplyCheck reading,
            Certainty certainty) {
        foods.requireMealConsent(account);
        if (!model.mayAsk(account, purpose)) {
            throw new ApiException(ErrorCode.CONSENT_REQUIRED);
        }
        Turn turn = sent.get();
        Optional<LocalDate> taken = quota.take(account, use);
        if (taken.isEmpty()) {
            return new Draft(Mode.DETERMINISTIC, List.of());
        }
        ModelReply reply;
        try {
            reply = model.ask(account, purpose, system, List.of(turn));
        } catch (RuntimeException notAsked) {
            try {
                quota.giveBack(account, use, taken.get());
            } catch (RuntimeException alsoFailed) {
                notAsked.addSuppressed(alsoFailed);
            }
            throw notAsked;
        }
        return reading.read(reply.text()).map(items -> new Draft(Mode.MODEL, items.stream().map(item -> matched(item, certainty)).toList()))
                .orElseGet(() -> new Draft(Mode.DETERMINISTIC, List.of()));
    }

    private Item matched(MealReplyCheck.Item item, Certainty certainty) {
        Amount amount = new Amount(item.quantity(), item.unit(), certainty);
        List<String> words = words(item.food());
        if (words.isEmpty()) {
            return new Item(item.food(), amount, false, List.of());
        }
        List<FoodFinder.FoodMatch> every = foods.find(String.join(" ", words), properties.candidates() * 2);
        List<FoodFinder.FoodMatch> whole = every.stream().filter(food -> holdsWhole(food, words)).toList();
        if (!whole.isEmpty()) {
            List<FoodFinder.FoodMatch> ranked = new ArrayList<>(whole);
            every.stream().filter(food -> !whole.contains(food)).forEach(ranked::add);
            return new Item(item.food(), amount, true, ranked.subList(0, Math.min(properties.candidates(), ranked.size())));
        }
        if (!every.isEmpty()) {
            return new Item(item.food(), amount, false, every.subList(0, Math.min(properties.candidates(), every.size())));
        }
        return new Item(item.food(), amount, false, inTurn(words));
    }

    /** The foods of each word, the first of each, then the second of each, …, until there are enough (K-504 review). */
    private List<FoodFinder.FoodMatch> inTurn(List<String> words) {
        List<List<FoodFinder.FoodMatch>> perWord = words.stream().map(word -> foods.find(word, properties.candidates())).toList();
        Map<String, FoodFinder.FoodMatch> offered = new LinkedHashMap<>();
        for (int rank = 0; rank < properties.candidates() && offered.size() < properties.candidates(); rank++) {
            for (List<FoodFinder.FoodMatch> found : perWord) {
                if (rank < found.size() && offered.size() < properties.candidates()) {
                    offered.putIfAbsent(found.get(rank).id(), found.get(rank));
                }
            }
        }
        return new ArrayList<>(offered.values());
    }

    /** The item's words to look a food up by: lower case, of two letters or more, no stop word, in the model's order. */
    private List<String> words(String food) {
        return Arrays.stream(food.toLowerCase(Locale.ROOT).split("[^\\p{L}]+")).filter(word -> word.length() >= 2 && !stopWords.contains(word))
                .distinct().toList();
    }

    /** Whether the food's name and brand hold every word as a whole word (a plural "s" either way). */
    private static boolean holdsWhole(FoodFinder.FoodMatch food, List<String> words) {
        Set<String> named = Arrays.stream((food.name() + " " + (food.brand() == null ? "" : food.brand())).toLowerCase(Locale.ROOT).split("[^\\p{L}]+"))
                .filter(word -> !word.isEmpty()).collect(Collectors.toSet());
        return words.stream().allMatch(word -> named.contains(word) || named.contains(word + "s") || word.endsWith("s") && named.contains(word.substring(0, word.length() - 1)));
    }
}
