package app.keel.engine;

import app.keel.engine.CheckIn.Recovery;
import app.keel.engine.CheckIn.Training;
import java.math.BigDecimal;
import java.math.MathContext;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;

/**
 * Where training and recovery stand, read from the set log (K-1218, ADR-091 Ek 7; design plan/k1218-oneri.md): a pure
 * function of the program's compound lifts and their working sets.
 *
 * <ul>
 *   <li><b>Per lift</b>: a session's e1RM is its best {@link E1rm} estimate (H3 B15; sets without RIR or past ten reps to
 *       failure give none). The mean of the last trend_sessions_per_side sessions against the mean of the sessions before
 *       them, within the last trend_window_days: a change of e1rm_trend_noise_pct or more is UP or DOWN, less is FLAT. A
 *       lift without twice that many sessions is not read.</li>
 *   <li><b>Training</b>: the majority of the readable lifts (trend_majority; at least trend_min_lifts of them, or the one
 *       compound a program has). A majority DOWN is DECLINING; a majority UP and none DOWN IMPROVING; else STABLE. Too few
 *       readable lifts: UNKNOWN, and the engine asks (U3). Not one session logged in the seven days to today is UNKNOWN
 *       too, never NOT_TRAINED: a missing log is no evidence, the user may train elsewhere (design §4), so they are asked.</li>
 *   <li><b>Recovery</b>: only POOR. A lift is tired when, at a load and reps done in all of its sessions read, the mean RIR
 *       of the last sessions is rir_drift_poor or more under that of the sessions before them (G7 K-67: effort rising) and
 *       its e1RM is not UP; a majority of the lifts that have such a load is POOR. The log cannot say GOOD: sleep and food
 *       are not in it.</li>
 *   <li><b>Excluded days</b> (a rest or lighter week and the week after it, a declared state): their sessions do not count,
 *       and a check-in week that holds one is not read at all, so the answer stands.</li>
 * </ul>
 *
 * <p>Where the log reads, it wins over the user's answer; where it does not, the answer stands ({@link #withLog}). A reading
 * that changed the call is named beside the rule that decided it ({@link #decide}).
 */
public final class TrainingTrend {

    static final RuleId TRAINING_LOG_DECLINING = new RuleId("training_log_declining");
    static final RuleId TRAINING_LOG_IMPROVING = new RuleId("training_log_improving");
    static final RuleId TRAINING_LOG_STABLE = new RuleId("training_log_stable");
    static final RuleId RECOVERY_LOG_POOR = new RuleId("recovery_log_poor");

    // The metric the log reading rests on (e1RM as a trend, H3 B15); the margins are noted in the parameters.
    private static final Source LOG_METRIC = new Source("arastirma/ham/H3-bosluk-literatur.md#B15", SourceTag.LITERATURE);

    private static final int DAYS_PER_WEEK = 7;
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private TrainingTrend() {
    }

    /** One working set of a lift: its load (bodyweight included for a bodyweight move), reps and RIR (null: not logged). */
    public record LoggedSet(BigDecimal loadKg, int reps, Integer rir) {

        public LoggedSet {
            Objects.requireNonNull(loadKg, "loadKg");
        }
    }

    /** The working sets of one workout on one day. */
    public record Session(LocalDate day, List<LoggedSet> sets) {

        public Session {
            Objects.requireNonNull(day, "day");
            sets = List.copyOf(sets);
        }
    }

    /** A compound lift of the program with its sessions, oldest first. */
    public record Lift(String exerciseId, List<Session> sessions) {

        public Lift {
            Objects.requireNonNull(exerciseId, "exerciseId");
            sessions = List.copyOf(sessions);
        }
    }

    /** What the log says; UNKNOWN where it cannot say. {@code recovery} is POOR or UNKNOWN, never GOOD. */
    public record Reading(Training training, Recovery recovery) {

        public static final Reading UNKNOWN = new Reading(Training.UNKNOWN, Recovery.UNKNOWN);

        public Reading {
            Objects.requireNonNull(training, "training");
            Objects.requireNonNull(recovery, "recovery");
        }
    }

    /** A lift's effort over the sessions read (K-1265): RISING is tired as the recovery reads it, STEADY is not. */
    public enum Effort { RISING, STEADY }

    /** One lift's effort, where it can be read. */
    public record LiftEffort(String exerciseId, Effort effort) {

        public LiftEffort {
            Objects.requireNonNull(exerciseId, "exerciseId");
            Objects.requireNonNull(effort, "effort");
        }
    }

    /**
     * Each lift's effort as the recovery reads it (K-1265, ADR-096 #4): what the coach may say about why a lift felt heavy, and
     * only that — the log holds no sleep or food. In the program's order; a lift without a load and reps done in every session
     * read is left out, and nothing is read where {@link #read} reads nothing (a declared or lighter day this week, no session
     * this week).
     */
    public static List<LiftEffort> efforts(List<Lift> lifts, LocalDate today, Set<LocalDate> excluded, Parameters parameters) {
        if (!readable(lifts, today, excluded)) {
            return List.of();
        }
        LocalDate windowFrom = today.minusDays(parameters.wholeNumber(ParameterKey.TREND_WINDOW_DAYS) - 1L);
        return lifts.stream().flatMap(lift -> readLift(lift, windowFrom, today, excluded, parameters).tired().stream()
                .map(tired -> new LiftEffort(lift.exerciseId(), tired ? Effort.RISING : Effort.STEADY))).toList();
    }

    /** Whether the log can say anything this week: a lift, no excluded day in the seven days to today, a session among them. */
    private static boolean readable(List<Lift> lifts, LocalDate today, Set<LocalDate> excluded) {
        LocalDate weekFrom = today.minusDays(DAYS_PER_WEEK - 1L);
        if (lifts.isEmpty() || excluded.stream().anyMatch(day -> !day.isBefore(weekFrom) && !day.isAfter(today))) {
            return false;
        }
        // No session logged this week: the log cannot say how the week went (a missing log is no evidence), so the answer stands.
        return lifts.stream().flatMap(lift -> lift.sessions().stream())
                .anyMatch(session -> !session.day().isBefore(weekFrom) && !session.day().isAfter(today));
    }

    private enum Direction { UP, FLAT, DOWN }

    /** One lift read: its direction and whether it is tired (only where a load and reps were done in every session read). */
    private record LiftRead(Optional<Direction> direction, Optional<Boolean> tired) {
    }

    /**
     * The reading at {@code today}. {@code excluded}: days whose sessions do not count (see the class doc). The lifts are the
     * program's compound lifts, those with no session included: their number sets how many must be readable.
     */
    public static Reading read(List<Lift> lifts, LocalDate today, Set<LocalDate> excluded, Parameters parameters) {
        if (!readable(lifts, today, excluded)) {
            return Reading.UNKNOWN;
        }
        LocalDate windowFrom = today.minusDays(parameters.wholeNumber(ParameterKey.TREND_WINDOW_DAYS) - 1L);
        List<LiftRead> reads = lifts.stream().map(lift -> readLift(lift, windowFrom, today, excluded, parameters)).toList();
        int needed = Math.max(1, Math.min(parameters.wholeNumber(ParameterKey.TREND_MIN_LIFTS), lifts.size()));
        BigDecimal majority = BigDecimal.valueOf(parameters.number(ParameterKey.TREND_MAJORITY));

        List<Direction> directions = reads.stream().flatMap(read -> read.direction().stream()).toList();
        Training training = Training.UNKNOWN;
        if (directions.size() >= needed) {
            BigDecimal half = majority.multiply(BigDecimal.valueOf(directions.size()));
            long down = directions.stream().filter(direction -> direction == Direction.DOWN).count();
            long up = directions.stream().filter(direction -> direction == Direction.UP).count();
            if (BigDecimal.valueOf(down).compareTo(half) >= 0) {
                training = Training.DECLINING;
            } else if (down == 0 && BigDecimal.valueOf(up).compareTo(half) >= 0) {
                training = Training.IMPROVING;
            } else {
                training = Training.STABLE;
            }
        }

        List<Boolean> tired = reads.stream().flatMap(read -> read.tired().stream()).toList();
        Recovery recovery = Recovery.UNKNOWN;
        if (tired.size() >= needed
                && BigDecimal.valueOf(tired.stream().filter(Boolean::booleanValue).count()).compareTo(majority.multiply(BigDecimal.valueOf(tired.size()))) >= 0
                && tired.contains(Boolean.TRUE)) {
            recovery = Recovery.POOR;
        }
        return new Reading(training, recovery);
    }

    private static LiftRead readLift(Lift lift, LocalDate from, LocalDate today, Set<LocalDate> excluded, Parameters parameters) {
        int side = parameters.wholeNumber(ParameterKey.TREND_SESSIONS_PER_SIDE);
        // The sessions that count and have an e1RM, oldest first.
        List<Session> counted = lift.sessions().stream()
                .filter(session -> !session.day().isBefore(from) && !session.day().isAfter(today) && !excluded.contains(session.day()))
                .filter(session -> best(session, parameters).isPresent())
                .sorted(Comparator.comparing(Session::day)).toList();
        if (counted.size() < 2 * side) {
            return new LiftRead(Optional.empty(), Optional.empty());
        }
        List<Session> read = counted.subList(counted.size() - 2 * side, counted.size());
        List<Session> before = read.subList(0, side);
        List<Session> recent = read.subList(side, 2 * side);
        BigDecimal prior = mean(before.stream().map(session -> best(session, parameters).orElseThrow()).toList());
        BigDecimal now = mean(recent.stream().map(session -> best(session, parameters).orElseThrow()).toList());
        BigDecimal changePct = now.subtract(prior).multiply(HUNDRED).divide(prior, MathContext.DECIMAL64);
        BigDecimal noise = BigDecimal.valueOf(parameters.number(ParameterKey.E1RM_TREND_NOISE_PCT));
        Direction direction = changePct.compareTo(noise) >= 0 ? Direction.UP : changePct.compareTo(noise.negate()) <= 0 ? Direction.DOWN : Direction.FLAT;
        Optional<Boolean> tired = rirDrift(read, side, parameters).map(drift -> drift && direction != Direction.UP);
        return new LiftRead(Optional.of(direction), tired);
    }

    /**
     * Whether the RIR fell by rir_drift_poor or more at a load and reps done in every session read; empty when there is no
     * such load (or a set of it has no RIR). The heaviest such load is read.
     */
    private static Optional<Boolean> rirDrift(List<Session> read, int side, Parameters parameters) {
        int drift = parameters.wholeNumber(ParameterKey.RIR_DRIFT_POOR);
        List<LoggedSet> latest = read.getLast().sets();
        List<LoggedSet> candidates = latest.stream().filter(set -> set.rir() != null)
                .sorted(Comparator.comparing(LoggedSet::loadKg).reversed()).toList();
        for (LoggedSet candidate : candidates) {
            List<BigDecimal> means = new ArrayList<>();
            for (Session session : read) {
                List<Integer> rirs = session.sets().stream().filter(set -> set.rir() != null && set.reps() == candidate.reps()
                        && set.loadKg().compareTo(candidate.loadKg()) == 0).map(LoggedSet::rir).toList();
                if (rirs.isEmpty()) {
                    break;
                }
                means.add(mean(rirs.stream().map(BigDecimal::valueOf).toList()));
            }
            if (means.size() == read.size()) {
                BigDecimal prior = mean(means.subList(0, side));
                BigDecimal now = mean(means.subList(side, means.size()));
                return Optional.of(prior.subtract(now).compareTo(BigDecimal.valueOf(drift)) >= 0);
            }
        }
        return Optional.empty();
    }

    private static Optional<BigDecimal> best(Session session, Parameters parameters) {
        return session.sets().stream().map(set -> E1rm.estimate(set.loadKg(), set.reps(), set.rir(), parameters))
                .flatMap(Optional::stream).max(Comparator.naturalOrder());
    }

    private static BigDecimal mean(List<BigDecimal> values) {
        return values.stream().reduce(BigDecimal.ZERO, BigDecimal::add).divide(BigDecimal.valueOf(values.size()), MathContext.DECIMAL64);
    }

    /** The answer with what the log reads laid over it: the log where it knows, the answer where it does not. */
    public static CheckIn withLog(CheckIn answered, Reading log) {
        CheckIn merged = log.training() == Training.UNKNOWN ? answered : answered.withTraining(log.training());
        return log.recovery() == Recovery.UNKNOWN ? merged : merged.withRecovery(log.recovery());
    }

    /**
     * The call on the answer with the log laid over it. Where the log disagreed with an answer given and that changed the
     * call (the action or the rule that decided), the reading is named as a reason after the one that decided: the log says
     * one thing, the answer another, and the log decided.
     */
    public static Decision decide(Function<CheckIn, Decision> engine, CheckIn answered, Reading log) {
        Decision byLog = engine.apply(withLog(answered, log));
        List<Reason> said = new ArrayList<>();
        if (log.training() != Training.UNKNOWN && answered.training() != Training.UNKNOWN && answered.training() != log.training()) {
            said.add(new Reason(switch (log.training()) {
                case DECLINING -> TRAINING_LOG_DECLINING;
                case IMPROVING -> TRAINING_LOG_IMPROVING;
                case STABLE -> TRAINING_LOG_STABLE;
                // read() never says these: no session this week, or too little log, is UNKNOWN.
                case NOT_TRAINED, UNKNOWN -> throw new IllegalStateException("the log never reads " + log.training());
            }, LOG_METRIC));
        }
        if (log.recovery() == Recovery.POOR && answered.recovery() != Recovery.UNKNOWN && answered.recovery() != Recovery.POOR) {
            said.add(new Reason(RECOVERY_LOG_POOR, LOG_METRIC));
        }
        if (said.isEmpty()) {
            return byLog;
        }
        Decision byAnswer = engine.apply(answered);
        if (byAnswer.action().equals(byLog.action()) && byAnswer.reasons().getFirst().rule().equals(byLog.reasons().getFirst().rule())) {
            return byLog;
        }
        List<Reason> reasons = new ArrayList<>(byLog.reasons());
        reasons.addAll(1, said);
        return new Decision(byLog.action(), reasons, byLog.confidence(), byLog.nextReview(), byLog.copyKey());
    }
}
