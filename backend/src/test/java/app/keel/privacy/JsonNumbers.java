package app.keel.privacy;

import java.util.regex.Pattern;

/**
 * A number looked for in a JSON body as a value (K-994): after {@code :}, {@code [} or {@code ,}, quoted or not, with a decimal
 * column's trailing zeros, and then the end of the value. The same digits inside a random UUID or another number are not it, so a
 * test that says "this number is not in the body" fails only when the number is.
 */
final class JsonNumbers {

    private JsonNumbers() {}

    static Pattern asValue(String number) {
        String trailingZeros = number.contains(".") ? "0*" : "(\\.0+)?";
        return Pattern.compile("[:\\[,]\"?" + Pattern.quote(number) + trailingZeros + "\"?[,\\]}]");
    }
}
