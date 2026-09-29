package app.keel.engine;

/**
 * How far this user's logs run under (positive) or over (negative) what their weight shows, in kcal a day, as a range
 * (U5), and over how many windows it was learned (K-115). The range is the gap to the formula's maintenance ± the
 * formula's typical error and the scale's noise, which the logs' bias cannot be told apart from; it is claimed only when
 * it excludes zero. For someone the formula misses by more than its typical spread, the gap is partly the formula's —
 * the words about it say both readings. A property of logging, not of the person: never shown as blame (U7).
 */
public record IntakeBias(int lowKcalPerDay, int highKcalPerDay, int windows) {

    public IntakeBias {
        if (lowKcalPerDay > highKcalPerDay) {
            throw new IllegalArgumentException("A range runs low to high, got " + lowKcalPerDay + " to " + highKcalPerDay);
        }
        if (lowKcalPerDay <= 0 && highKcalPerDay >= 0) {
            throw new IllegalArgumentException("A bias range excludes zero, got " + lowKcalPerDay + " to " + highKcalPerDay);
        }
        if (windows < 1) {
            throw new IllegalArgumentException("A bias is learned over at least one window, got " + windows);
        }
    }
}
