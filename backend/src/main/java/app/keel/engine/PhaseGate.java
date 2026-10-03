package app.keel.engine;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * The phase gate: which direction, cut or bulk. Staying at maintenance is not a direction (coaching experience, 03 §2.1).
 *
 * <ul>
 *   <li>A bulk above the fat ceiling turns into a cut (G6 K-7: above 20 % muscle gain is at a disadvantage).</li>
 *   <li>Above the fat-first line the reason is stronger: lose fat first (G4 K-10: added muscle does not show;
 *       G4 K-4: nearly every beginner starts here).</li>
 *   <li>A cut below the surplus line turns into a bulk (03 §2.1: under 12 % the direction is surplus; 12-25 % is
 *       the user's goal and preference — G6 K-8's 15-20 % band is where people choose to sit, not a forced switch).
 *       Not a mini cut: it ends on its own day (K-227).</li>
 * </ul>
 *
 * <p>A woman's bands sit 10 points higher (J1 B1: essential fat ~12 % vs ~3 %); her decisions name that research
 * too. U4: the estimate is read here and nowhere else leaves the engine as a number (NoFatNumberInOutputTests).
 * Without an estimate the gate stays out.
 */
public final class PhaseGate {

    static final RuleId BULK_CEILING = new RuleId("bulk_ceiling");
    static final RuleId FAT_FIRST = new RuleId("fat_first");
    static final RuleId SURPLUS_ZONE = new RuleId("surplus_zone");
    static final RuleId FEMALE_FAT_OFFSET = new RuleId("female_fat_offset");

    private static final Source CEILING_SOURCE = new Source("arastirma/ham/guray/G6-eski-arsiv.md#K-7", SourceTag.EXPERIENCE);
    private static final Source FAT_FIRST_SOURCE = new Source("arastirma/ham/guray/G4-ilerleme-metabolik.md#K-10", SourceTag.EXPERIENCE);
    private static final Source ENTRY_GATE_SOURCE = new Source("arastirma/03-guray-karar-omurgasi.md#2.1", SourceTag.EXPERIENCE);
    private static final Source FEMALE_OFFSET = new Source("arastirma/ham/J1-cinsiyet.md#B1", SourceTag.LITERATURE);

    private static final int DAYS_PER_WEEK = 7;

    private PhaseGate() {
    }

    /** A change of direction if the body-fat estimate calls for one; empty if the current phase stands. */
    public static Optional<Decision> check(Snapshot snapshot, Parameters parameters) {
        if (snapshot.fatProxyPct().isEmpty()) {
            return Optional.empty();
        }
        // Each direction reads the estimate cautious for it (ADR-027 #11): a bulk stops on the higher, a cut turns on the lower.
        BigDecimal fat = snapshot.phase() == Phase.BULK ? snapshot.fatProxyHighPct().orElseThrow() : snapshot.fatProxyPct().orElseThrow();
        return switch (snapshot.phase()) {
            case BULK -> {
                if (fat.compareTo(band(parameters, ParameterKey.FAT_FIRST_FAT_PROXY_PCT)) > 0) {
                    yield Optional.of(change(snapshot, Phase.CUT, FAT_FIRST, FAT_FIRST_SOURCE));
                }
                if (fat.compareTo(band(parameters, ParameterKey.BULK_CEILING_FAT_PROXY_PCT)) > 0) {
                    yield Optional.of(change(snapshot, Phase.CUT, BULK_CEILING, CEILING_SOURCE));
                }
                yield Optional.empty();
            }
            // Strictly below: "< %12" (03 §2.1). From there up to ~25 % the direction is the user's goal.
            // A mini cut is not turned back here: it returns to building on its own day (K-227, MiniCutGate.over) —
            // turned at its first judged week it would end under mini_cut_weeks_min (G7 K-102).
            case CUT -> snapshot.miniCutUntil().isEmpty() && fat.compareTo(band(parameters, ParameterKey.SURPLUS_BELOW_FAT_PROXY_PCT)) < 0
                    ? Optional.of(change(snapshot, Phase.BULK, SURPLUS_ZONE, ENTRY_GATE_SOURCE))
                    : Optional.empty();
        };
    }

    /**
     * The first direction when the user leaves it to the engine (ADR-027 #17, K-222): a build only for a body the gate
     * would turn to building from a cut and would not stop building; anything else, and without an estimate, a cut (G4 K-4:
     * most people start by losing fat).
     */
    public static Phase startingPhase(Optional<BigDecimal> lowerPct, Optional<BigDecimal> higherPct, Parameters parameters) {
        boolean lean = lowerPct.filter(pct -> pct.compareTo(band(parameters, ParameterKey.SURPLUS_BELOW_FAT_PROXY_PCT)) < 0).isPresent();
        boolean underTheCeiling = higherPct.filter(pct -> pct.compareTo(band(parameters, ParameterKey.BULK_CEILING_FAT_PROXY_PCT)) <= 0).isPresent();
        return lean && underTheCeiling ? Phase.BULK : Phase.CUT;
    }

    private static BigDecimal band(Parameters parameters, ParameterKey key) {
        return BigDecimal.valueOf(parameters.number(key));
    }

    // A visual/waist estimate is a proxy (H1: fat percentage change cannot be tracked precisely), so a phase call
    // on it is MEDIUM confidence. The new direction is looked at again at the next weekly check-in.
    private static Decision change(Snapshot snapshot, Phase to, RuleId rule, Source source) {
        List<Reason> reasons = new ArrayList<>(List.of(new Reason(rule, source)));
        if (snapshot.sex() == Sex.FEMALE) {
            reasons.add(new Reason(FEMALE_FAT_OFFSET, FEMALE_OFFSET));
        }
        Action action = new Action.ChangePhase(to);
        return new Decision(action, reasons, Confidence.MEDIUM, snapshot.today().plusDays(DAYS_PER_WEEK),
                new CopyKey("decision." + action.type().name().toLowerCase(Locale.ROOT) + "." + rule.value()));
    }
}
