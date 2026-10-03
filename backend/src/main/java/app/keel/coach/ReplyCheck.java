package app.keel.coach;

import app.keel.decision.CallFacts;
import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

/**
 * Whether a model's reply may be shown (K-505, ADR-004: a reply off its schema is dropped): JSON of exactly
 * {@code {"text": …}}, not blank, within {@code maxChars}; every number one the call has ({@link CallNumbers}, U1); no
 * concession (U2, {@link ReplyGuards}); no forbidden phrase or name ({@link ForbiddenWords}, U4, U6, K-523).
 */
final class ReplyCheck {

    // A number as written: digits with thousands commas, or digits with a decimal part.
    private static final Pattern NUMBER = Pattern.compile("\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?|\\d+(?:\\.\\d+)?");
    private static final JsonMapper JSON = JsonMapper.builder().build();

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
        Set<BigDecimal> own = CallNumbers.of(call);
        Matcher numbers = NUMBER.matcher(text);
        while (numbers.find()) {
            BigDecimal said = new BigDecimal(numbers.group().replace(",", "")).stripTrailingZeros();
            if (own.stream().noneMatch(number -> number.compareTo(said) == 0)) {
                return Optional.empty();
            }
        }
        if (!guards.found(text).isEmpty() || !forbidden.found(text).isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(text);
    }
}
