package app.keel.coach;

import app.keel.decision.CallFacts;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

/**
 * Whether a model's reply may be shown (K-505, ADR-004: a reply off its schema is dropped): JSON of exactly
 * {@code {"text": …}}, not blank, within {@code maxChars}; read as {@link Words#normalize} reads it: every number one the call
 * has ({@link CallNumbers}, U1) — digits only, the review day only as that date; no concession, no contradiction of the
 * call's kind, no number in words (U2, {@link ReplyGuards}); no forbidden phrase or name ({@link ForbiddenWords}, U4, U6,
 * K-523).
 */
final class ReplyCheck {

    // A number as written: digits with thousands commas, or digits with a decimal part.
    private static final Pattern NUMBER = Pattern.compile("\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?|\\d+(?:\\.\\d+)?");
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final Pattern OTHER_DIGITS = Pattern.compile("[\\p{Nd}&&[^0-9]]");
    private static final String MONTH = "(january|february|march|april|may|june|july|august|september|october|november|december|"
            + "jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\\.?";
    private static final String DAY = "(\\d{1,2})(?:st|nd|rd|th)?";
    // The review day as a date: "12 October (2026)", "October 12(, 2026)", "the 12th" — day, month, year in their places.
    private static final Pattern DAY_MONTH = Pattern.compile("\\b" + DAY + " (?:of )?" + MONTH + "(?:,? (\\d{4}))?\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern MONTH_DAY = Pattern.compile("\\b" + MONTH + " " + DAY + "(?:,? (\\d{4}))?\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern ORDINAL = Pattern.compile("\\b(\\d{1,2})(?:st|nd|rd|th)\\b", Pattern.CASE_INSENSITIVE);

    private final int maxChars;
    private final ReplyGuards guards;
    private final ForbiddenWords forbidden;

    ReplyCheck(int maxChars, ReplyGuards guards, ForbiddenWords forbidden) {
        this.maxChars = maxChars;
        this.guards = guards;
        this.forbidden = forbidden;
    }

    static ReplyCheck fromClasspath(int maxChars) {
        return new ReplyCheck(maxChars, ReplyGuards.fromClasspath(), ForbiddenWords.fromClasspath());
    }

    /**
     * The text with the call's review day taken out wherever it is said as that date — any other date stays, and its
     * numbers are checked like any (the day is never a bare number: "12 sets" on a call reviewed on the 12th is not it).
     */
    static String withoutTheReviewDay(String text, LocalDate review) {
        String out = replace(DAY_MONTH, text, match -> isReview(review, match.group(1), match.group(2), match.group(3)));
        out = replace(MONTH_DAY, out, match -> isReview(review, match.group(2), match.group(1), match.group(3)));
        return replace(ORDINAL, out, match -> Integer.parseInt(match.group(1)) == review.getDayOfMonth());
    }

    private static boolean isReview(LocalDate review, String day, String month, String year) {
        return Integer.parseInt(day) == review.getDayOfMonth()
                && review.getMonth().name().toLowerCase(java.util.Locale.ROOT).startsWith(month.toLowerCase(java.util.Locale.ROOT).replace(".", ""))
                && (year == null || Integer.parseInt(year) == review.getYear());
    }

    private static String replace(Pattern pattern, String text, java.util.function.Predicate<java.util.regex.MatchResult> isReview) {
        return pattern.matcher(text).replaceAll(match -> isReview.test(match) ? " " : Matcher.quoteReplacement(match.group()));
    }

    Optional<String> read(String raw, CallFacts call) {
        Object parsed;
        try {
            parsed = JSON.readValue(raw, Object.class);
        } catch (JacksonException notJson) {
            return Optional.empty();
        }
        if (!(parsed instanceof Map<?, ?> reply) || reply.size() != 1 || !(reply.get("text") instanceof String text)
                || text.isBlank() || text.length() > maxChars) {
            return Optional.empty();
        }
        String read = Words.normalize(text);
        // Digits of another script are not checked as numbers: not said at all (U1).
        if (OTHER_DIGITS.matcher(read).find()) {
            return Optional.empty();
        }
        Set<BigDecimal> own = CallNumbers.of(call);
        Matcher numbers = NUMBER.matcher(withoutTheReviewDay(read, call.nextReview()));
        while (numbers.find()) {
            BigDecimal said = new BigDecimal(numbers.group().replace(",", "")).stripTrailingZeros();
            if (own.stream().noneMatch(number -> number.compareTo(said) == 0)) {
                return Optional.empty();
            }
        }
        if (!guards.found(read, call.action()).isEmpty() || !forbidden.found(read).isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(text);
    }
}
