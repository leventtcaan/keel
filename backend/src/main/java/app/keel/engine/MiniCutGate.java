package app.keel.engine;

import app.keel.engine.CheckIn.Appetite;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * The mini cut (G7 K-102, spec WC-20): after mini_cut_after_bulk_months of bulk, when appetite is gone — the user can't
 * even eat what they used to and forces food down — a deficit of mini_cut_weeks_min to mini_cut_weeks_max weeks. The
 * first weeks bring no hunger; by week 3-4 appetite returns and the fat the bulk added is gone: an appetite reset.
 */
public final class MiniCutGate {

    static final RuleId APPETITE_GONE = new RuleId("appetite_gone");
    private static final Source MINI_CUT = new Source("arastirma/ham/guray/G7-whisper-arsiv.md#K-102", SourceTag.EXPERIENCE);
    private static final int DAYS_PER_WEEK = 7;

    private MiniCutGate() {
    }

    public static Optional<Decision> check(Snapshot snapshot, Parameters parameters) {
        boolean longBulk = !snapshot.today().isBefore(
                snapshot.phaseStart().plusMonths(parameters.wholeNumber(ParameterKey.MINI_CUT_AFTER_BULK_MONTHS)));
        if (snapshot.phase() != Phase.BULK || snapshot.checkIn().appetite() != Appetite.GONE || !longBulk) {
            return Optional.empty();
        }
        Action action = new Action.MiniCut(parameters.wholeNumber(ParameterKey.MINI_CUT_WEEKS_MIN),
                parameters.wholeNumber(ParameterKey.MINI_CUT_WEEKS_MAX));
        // The user's own report plus a long bulk: an experience rule without a measured threshold, so MEDIUM.
        return Optional.of(new Decision(action, List.of(new Reason(APPETITE_GONE, MINI_CUT)), Confidence.MEDIUM,
                snapshot.today().plusDays(DAYS_PER_WEEK),
                new CopyKey("decision." + action.type().name().toLowerCase(Locale.ROOT) + "." + APPETITE_GONE.value())));
    }
}
