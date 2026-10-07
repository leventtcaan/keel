package app.keel.engine;

import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

/**
 * A week's cardio (K-958, ADR-074 #1, #3, #4): {@code minutes} per session, at most one session a day, each after the
 * weights on a training day or at a very low pace on an off day. There is no placement before the weights (G2 K-35).
 *
 * <p>The default ({@link #forWeek}) rests on the solo cardio source only (G2 KRD24 via K-32, K-35, K-36, K-46; K-31 from
 * KV24 for the length); the podcast's "at least one, typically two" is not used, its speaker is unclear (G2 header
 * warning 1). A fat-loss phase gets as many sessions as training days within cardio_sessions_cut_min..max, a muscle-gain
 * phase cardio_sessions_build. A week with fewer training days than sessions puts the rest on off days (K-36: cardio on an
 * off day, if any, at a very low pace). Very active work has no default (K-46). The user's own prescription is returned
 * as it is: the engine never overwrites it (ADR-074 #4). Pure: the phase and the days come in (ADR-003).
 */
public record CardioPrescription(CardioOrigin origin, int minutes, List<CardioSession> sessions, List<Reason> reasons) {

    static final RuleId CARDIO_CUT_DOSE = new RuleId("cardio_cut_dose");
    static final RuleId CARDIO_BUILD_DOSE = new RuleId("cardio_build_dose");
    static final RuleId CARDIO_AFTER_LIFT = new RuleId("cardio_after_lift");
    static final RuleId CARDIO_OFF_DAY = new RuleId("cardio_off_day_low_intensity");
    static final RuleId CARDIO_AFTER_LIFT_OVER_LINE = new RuleId("cardio_after_lift_over_line");

    private static final Source DOSE_SOURCE = new Source("arastirma/ham/guray/G2-kilo-verme.md#K-32", SourceTag.EXPERIENCE);
    private static final Source TIMING_SOURCE = new Source("arastirma/ham/guray/G2-kilo-verme.md#K-35", SourceTag.EXPERIENCE);
    private static final Source OFF_DAY_SOURCE = new Source("arastirma/ham/guray/G2-kilo-verme.md#K-36", SourceTag.EXPERIENCE);

    static final Reason CUT_DOSE = new Reason(CARDIO_CUT_DOSE, DOSE_SOURCE);
    static final Reason BUILD_DOSE = new Reason(CARDIO_BUILD_DOSE, DOSE_SOURCE);
    static final Reason AFTER_LIFT = new Reason(CARDIO_AFTER_LIFT, TIMING_SOURCE);
    static final Reason OFF_DAY = new Reason(CARDIO_OFF_DAY, OFF_DAY_SOURCE);
    /** The info line for after-lifting cardio longer than cardio_after_lift_max_minutes: a note, not a block (ADR-074 #4). */
    public static final Reason AFTER_LIFT_LINE = new Reason(CARDIO_AFTER_LIFT_OVER_LINE, TIMING_SOURCE);

    private static final int DAYS_IN_WEEK = DayOfWeek.values().length;

    public CardioPrescription {
        Objects.requireNonNull(origin, "origin");
        sessions = sessions.stream().sorted(Comparator.comparing(CardioSession::day)).toList();
        reasons = List.copyOf(reasons);
        if (sessions.stream().map(CardioSession::day).distinct().count() != sessions.size()) {
            throw new IllegalArgumentException("one cardio session a day at most: " + sessions);
        }
        if (sessions.isEmpty() ? minutes < 0 : minutes < 1) {
            throw new IllegalArgumentException("a session lasts at least a minute, was " + minutes);
        }
        if (origin == CardioOrigin.GENERATED && (sessions.isEmpty() || reasons.isEmpty())) {
            throw new IllegalArgumentException("the engine's default has sessions and the rules behind them");
        }
        if (origin == CardioOrigin.USER && !reasons.isEmpty()) {
            throw new IllegalArgumentException("the user's own prescription rests on no engine rule");
        }
    }

    /** The user's own prescription; no sessions is cardio turned off (ADR-074 #4). */
    public static CardioPrescription user(int minutes, List<CardioSession> sessions) {
        return new CardioPrescription(CardioOrigin.USER, minutes, sessions, List.of());
    }

    /**
     * This week's prescription: the user's own if they set one, else the default for the phase and the training days,
     * or none for very active work. {@code activity} absent is not very active: the default applies.
     */
    public static Optional<CardioPrescription> forWeek(Phase phase, Set<DayOfWeek> trainingDays, Optional<ActivityLevel> activity,
            Optional<CardioPrescription> userSet, Parameters parameters) {
        Objects.requireNonNull(phase, "phase");
        Objects.requireNonNull(activity, "activity");
        Objects.requireNonNull(parameters, "parameters");
        if (userSet.isPresent()) {
            if (userSet.get().origin() != CardioOrigin.USER) {
                throw new IllegalArgumentException("only the user's own prescription is kept; the default is made here");
            }
            return userSet;
        }
        if (activity.equals(Optional.of(ActivityLevel.VERY_ACTIVE)) && parameters.flag(ParameterKey.CARDIO_NONE_VERY_ACTIVE)) {
            return Optional.empty();
        }
        EnumSet<DayOfWeek> training = EnumSet.noneOf(DayOfWeek.class);
        training.addAll(trainingDays);
        boolean cut = phase == Phase.CUT;
        int count = cut
                ? Math.clamp(training.size(), parameters.wholeNumber(ParameterKey.CARDIO_SESSIONS_CUT_MIN),
                        parameters.wholeNumber(ParameterKey.CARDIO_SESSIONS_CUT_MAX))
                : parameters.wholeNumber(ParameterKey.CARDIO_SESSIONS_BUILD);
        int minutes = parameters.wholeNumber(cut ? ParameterKey.CARDIO_MINUTES_CUT : ParameterKey.CARDIO_MINUTES_BUILD);

        List<CardioSession> sessions = new ArrayList<>();
        // After the weights on the week's first training days (EnumSet iterates Monday to Sunday).
        training.stream().limit(count).forEach(day -> sessions.add(new CardioSession(day, CardioPlacement.AFTER_LIFT)));
        // The rest on off days, each the furthest from any busy day, earliest on a tie, so a cardio day sits between
        // rest days where the week allows (K-36: off days are for recovery).
        Set<DayOfWeek> busy = EnumSet.copyOf(training);
        while (sessions.size() < count) {
            Optional<DayOfWeek> offDay = furthestFreeDay(busy);
            if (offDay.isEmpty()) {
                break; // a week has seven days
            }
            busy.add(offDay.get());
            sessions.add(new CardioSession(offDay.get(), CardioPlacement.OFF_DAY_LOW_INTENSITY));
        }

        List<Reason> reasons = new ArrayList<>();
        reasons.add(cut ? CUT_DOSE : BUILD_DOSE);
        if (sessions.stream().anyMatch(session -> session.placement() == CardioPlacement.AFTER_LIFT)) {
            reasons.add(AFTER_LIFT);
        }
        if (sessions.stream().anyMatch(session -> session.placement() == CardioPlacement.OFF_DAY_LOW_INTENSITY)) {
            reasons.add(OFF_DAY);
        }
        return Optional.of(new CardioPrescription(CardioOrigin.GENERATED, minutes, sessions, reasons));
    }

    /** Whether an after-lifting session runs past cardio_after_lift_max_minutes (G2 K-35): an info line, never a block. */
    public boolean afterLiftOverLine(Parameters parameters) {
        return minutes > parameters.wholeNumber(ParameterKey.CARDIO_AFTER_LIFT_MAX_MINUTES)
                && sessions.stream().anyMatch(session -> session.placement() == CardioPlacement.AFTER_LIFT);
    }

    private static Optional<DayOfWeek> furthestFreeDay(Set<DayOfWeek> busy) {
        DayOfWeek best = null;
        int bestDistance = -1;
        for (DayOfWeek day : DayOfWeek.values()) {
            if (busy.contains(day)) {
                continue;
            }
            int distance = busy.stream().mapToInt(other -> weekDistance(day, other)).min().orElse(DAYS_IN_WEEK);
            if (distance > bestDistance) {
                best = day;
                bestDistance = distance;
            }
        }
        return Optional.ofNullable(best);
    }

    // Days apart around the week: Sunday and Monday are neighbours.
    private static int weekDistance(DayOfWeek a, DayOfWeek b) {
        int apart = Math.abs(a.ordinal() - b.ordinal());
        return Math.min(apart, DAYS_IN_WEEK - apart);
    }
}
