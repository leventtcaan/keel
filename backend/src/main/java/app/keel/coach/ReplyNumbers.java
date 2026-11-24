package app.keel.coach;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The numbers a reply says, and whether each is one of the facts' (ADR-092 #2, U1). Digits are read as written ("1,900", "1.900"
 * (Turkish thousands: an integer), "0.4", "0,4", every script's digits after {@link Words#normalize}) and so are number words in
 * English and Turkish, compounds included ("twenty-five", "two hundred and fifty", "yirmibeş", "yüzelli", "binbeşyüz"): a number
 * spelled out is still a number. A number matches a fact when it is the fact's size (the sign is a direction, not a size) or the
 * fact rounded to the reply's own decimals (half up, or cut off), or, written with a percent sign, the fact as a fraction; and
 * when it names a unit (kcal, kg, steps, weeks) the fact is of that same kind: 500 kcal is not 500 steps, nor 3 kcal the 3
 * sessions done. A number with more decimals than the fact has is a number the engine never said.
 */
final class ReplyNumbers {

    /** The kind of a quantity: what a reply's number names after it, what a fact is. Counts of sessions, days and the like are NONE. */
    enum Unit { NONE, KCAL, KG, STEPS, WEEKS }

    /** A number in a reply: its value, whether a percent sign follows it and the unit it names. */
    record Said(BigDecimal value, boolean percent, Unit unit) {

        Said(BigDecimal value, boolean percent) {
            this(value, percent, Unit.NONE);
        }
    }

    /** A number of the facts and what it counts. */
    record Fact(BigDecimal value, Unit unit) {
    }

    // 1,900 (thousands, three digits after the comma) · 1.900 (Turkish thousands: three digits after the point, no zero first) · 0,4 / 0.4 · 12.
    private static final Pattern DIGITS = Pattern.compile(
            "(?<![\\p{N}.,])(\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?|[1-9]\\d{0,2}(?:\\.\\d{3})+(?![\\d,])|\\d+(?:[.,]\\d+)?)(\\s?%)?");
    private static final Pattern WORD = Pattern.compile("[\\p{L}]+");
    private static final Map<String, Unit> UNITS = Map.ofEntries(
            Map.entry("kcal", Unit.KCAL), Map.entry("kcals", Unit.KCAL), Map.entry("calorie", Unit.KCAL), Map.entry("calories", Unit.KCAL),
            Map.entry("cal", Unit.KCAL), Map.entry("kalori", Unit.KCAL), Map.entry("kalorilik", Unit.KCAL), Map.entry("kilokalori", Unit.KCAL),
            Map.entry("kg", Unit.KG), Map.entry("kgs", Unit.KG), Map.entry("kilo", Unit.KG), Map.entry("kilos", Unit.KG), Map.entry("kilogram", Unit.KG),
            Map.entry("kilograms", Unit.KG), Map.entry("lb", Unit.KG), Map.entry("lbs", Unit.KG), Map.entry("pound", Unit.KG), Map.entry("pounds", Unit.KG),
            Map.entry("step", Unit.STEPS), Map.entry("steps", Unit.STEPS), Map.entry("adım", Unit.STEPS), Map.entry("adımlık", Unit.STEPS),
            Map.entry("week", Unit.WEEKS), Map.entry("weeks", Unit.WEEKS), Map.entry("hafta", Unit.WEEKS), Map.entry("haftadır", Unit.WEEKS),
            Map.entry("haftalık", Unit.WEEKS), Map.entry("haftada", Unit.WEEKS));

    // Words that mean a number by themselves.
    private static final Map<String, BigDecimal> SINGLES = Map.ofEntries(
            Map.entry("twice", bd("2")), Map.entry("double", bd("2")), Map.entry("triple", bd("3")), Map.entry("half", bd("0.5")),
            Map.entry("dozen", bd("12")), Map.entry("couple", bd("2")), Map.entry("yarım", bd("0.5")));
    // The parts of a number in English. "one" counts only inside a longer number: it is a pronoun more often than a count.
    private static final Map<String, Integer> EN = Map.ofEntries(
            Map.entry("zero", 0), Map.entry("one", 1), Map.entry("two", 2), Map.entry("three", 3), Map.entry("four", 4), Map.entry("five", 5),
            Map.entry("six", 6), Map.entry("seven", 7), Map.entry("eight", 8), Map.entry("nine", 9), Map.entry("ten", 10), Map.entry("eleven", 11),
            Map.entry("twelve", 12), Map.entry("thirteen", 13), Map.entry("fourteen", 14), Map.entry("fifteen", 15), Map.entry("sixteen", 16),
            Map.entry("seventeen", 17), Map.entry("eighteen", 18), Map.entry("nineteen", 19), Map.entry("twenty", 20), Map.entry("thirty", 30),
            Map.entry("forty", 40), Map.entry("fifty", 50), Map.entry("sixty", 60), Map.entry("seventy", 70), Map.entry("eighty", 80),
            Map.entry("ninety", 90), Map.entry("hundred", 100), Map.entry("thousand", 1000), Map.entry("million", 1_000_000));
    // The parts in Turkish, run together in one word (yirmibeş, yüzelli, binbeşyüz). "on" (ten) and "bir" (one) count only inside
    // such a word: "on" is an English word too and "bir" is the article.
    private static final Map<String, Integer> TR = Map.ofEntries(
            Map.entry("bir", 1), Map.entry("iki", 2), Map.entry("üç", 3), Map.entry("dört", 4), Map.entry("beş", 5), Map.entry("altı", 6),
            Map.entry("yedi", 7), Map.entry("sekiz", 8), Map.entry("dokuz", 9), Map.entry("on", 10), Map.entry("yirmi", 20), Map.entry("otuz", 30),
            Map.entry("kırk", 40), Map.entry("elli", 50), Map.entry("altmış", 60), Map.entry("yetmiş", 70), Map.entry("seksen", 80),
            Map.entry("doksan", 90), Map.entry("yüz", 100), Map.entry("bin", 1000));

    private ReplyNumbers() {
    }

    private static BigDecimal bd(String value) {
        return new BigDecimal(value);
    }

    /** Every number the text says, in order; the text as {@link Words#normalize} reads it. */
    static List<Said> in(String text) {
        List<Said> said = new ArrayList<>();
        String read = Words.normalize(text);
        Matcher digits = DIGITS.matcher(read);
        while (digits.find()) {
            String written = digits.group(1);
            String plain = written.matches("\\d{1,3}(,\\d{3})+(\\.\\d+)?") ? written.replace(",", "")
                    : written.matches("[1-9]\\d{0,2}(\\.\\d{3})+") ? written.replace(".", "") : written.replace(',', '.');
            said.add(new Said(new BigDecimal(plain), digits.group(2) != null, unitAfter(read, digits.end())));
        }
        said.addAll(wordNumbers(read.toLowerCase(Locale.ROOT)));
        return said;
    }

    /** The unit the next word names, if it is one. */
    private static Unit unitAfter(String text, int from) {
        Matcher next = WORD.matcher(text);
        if (next.find(from) && text.substring(from, next.start()).isBlank()) {
            return UNITS.getOrDefault(next.group(), Unit.NONE);
        }
        return Unit.NONE;
    }

    private static List<Said> wordNumbers(String text) {
        List<String> words = new ArrayList<>();
        List<int[]> spans = new ArrayList<>();
        Matcher match = WORD.matcher(text);
        while (match.find()) {
            words.add(match.group());
            spans.add(new int[] {match.start(), match.end()});
        }
        List<Said> said = new ArrayList<>();
        int at = 0;
        while (at < words.size()) {
            String word = words.get(at);
            if (SINGLES.containsKey(word)) {
                said.add(new Said(SINGLES.get(word), false, unitAfter(text, spans.get(at)[1])));
                at++;
                continue;
            }
            Integer turkish = turkishCompound(word);
            if (turkish != null) {
                said.add(new Said(BigDecimal.valueOf(turkish), false, unitAfter(text, spans.get(at)[1])));
                at++;
                continue;
            }
            if (EN.containsKey(word)) {
                // The run of English number words joined by spaces, hyphens and "and": twenty-five, two hundred and fifty.
                int end = at;
                while (end + 1 < words.size() && (EN.containsKey(words.get(end + 1)) || (words.get(end + 1).equals("and") && end + 2 < words.size()
                        && EN.containsKey(words.get(end + 2)))) && text.substring(spans.get(end)[1], spans.get(end + 1)[0]).matches("[\\s-]+")) {
                    end += words.get(end + 1).equals("and") ? 2 : 1;
                }
                List<String> run = words.subList(at, end + 1).stream().filter(w -> !w.equals("and")).toList();
                if (run.size() > 1 || !word.equals("one")) {
                    said.addAll(englishRun(run, unitAfter(text, spans.get(end)[1])));
                }
                at = end + 1;
                continue;
            }
            at++;
        }
        return said;
    }

    /** "twenty five" is 25 and "two hundred fifty" 250; "five six" is two numbers (a part that cannot add on starts a new one). */
    private static List<Said> englishRun(List<String> run, Unit unit) {
        List<Said> numbers = new ArrayList<>();
        long total = 0;
        long current = 0;
        int last = -1;
        boolean open = false;
        for (String word : run) {
            int value = EN.get(word);
            boolean adds = !open || (value >= 100) || (last >= 20 && last % 10 == 0 && value < 10) || (last >= 100 && value < 100) || last == 1000;
            if (open && !adds) {
                numbers.add(new Said(BigDecimal.valueOf(total + current), false, Unit.NONE));
                total = 0;
                current = 0;
            }
            if (value >= 1000) {
                total += Math.max(current, 1) * value;
                current = 0;
            } else if (value == 100) {
                current = Math.max(current, 1) * 100;
            } else {
                current += value;
            }
            last = value;
            open = true;
        }
        numbers.add(new Said(BigDecimal.valueOf(total + current), false, unit));
        return numbers;
    }

    /** A Turkish number written as one word ("iki", "yirmibeş", "yüzelli", "binbeşyüz"; "bir" and "on" only inside a longer one), else null. */
    private static Integer turkishCompound(String word) {
        List<Integer> parts = new ArrayList<>();
        if (!split(word, 0, parts) || (parts.size() < 2 && (parts.getFirst() == 1 || parts.getFirst() == 10))) {
            return null;
        }
        long total = 0;
        long current = 0;
        for (int part : parts) {
            if (part == 1000) {
                total += Math.max(current, 1) * 1000;
                current = 0;
            } else if (part == 100) {
                current = Math.max(current, 1) * 100;
            } else {
                current += part;
            }
        }
        return (int) (total + current);
    }

    private static boolean split(String word, int from, List<Integer> parts) {
        if (from == word.length()) {
            return true;
        }
        for (Map.Entry<String, Integer> part : TR.entrySet()) {
            if (word.startsWith(part.getKey(), from)) {
                parts.add(part.getValue());
                if (split(word, from + part.getKey().length(), parts)) {
                    return true;
                }
                parts.removeLast();
            }
        }
        return false;
    }

    /** Whether {@code said} is {@code fact}'s size, rounded to what was said, or its percent — and of the unit it names. */
    static boolean matches(Said said, Fact fact) {
        if (said.unit() != Unit.NONE && said.unit() != fact.unit()) {
            return false;
        }
        return sameValue(said, fact.value());
    }

    /** As {@link #matches(Said, Fact)}, the size alone: what the model listed in numbersUsed names no unit. */
    static boolean sameValue(Said said, BigDecimal fact) {
        BigDecimal wanted = said.value().abs();
        BigDecimal size = fact.abs();
        if (sameSize(wanted, size, said.value().scale())) {
            return true;
        }
        // "50%" for a fraction of 0.5: the fraction in percent.
        return said.percent() && sameSize(wanted, size.movePointRight(2), said.value().scale());
    }

    private static boolean sameSize(BigDecimal said, BigDecimal fact, int decimals) {
        if (said.compareTo(fact) == 0) {
            return true;
        }
        // Rounded to the decimals the reply gives (never more than the fact has: that would be a number of the model's own).
        return fact.scale() > decimals && (fact.setScale(decimals, RoundingMode.HALF_UP).compareTo(said) == 0
                || fact.setScale(decimals, RoundingMode.DOWN).compareTo(said) == 0);
    }

    /** Whether a number the model listed is the size of a number it said. */
    static boolean listed(Said said, BigDecimal listed) {
        return sameValue(said, listed);
    }
}
