package app.keel.engine;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.ProgramReview.Catalog;
import app.keel.engine.ProgramReview.Day;
import app.keel.engine.ProgramReview.Move;
import app.keel.engine.ProgramReview.Program;
import app.keel.engine.ProgramReview.RemoveDay;
import app.keel.engine.ProgramReview.SetRepRange;
import app.keel.engine.ProgramReview.Suggestion;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import net.jqwik.api.statistics.Statistics;

/**
 * Program review over any program, empty days and repeated moves included (K-955, ADR-073 #2): the same program gives the
 * same suggestions; never more than review_max_suggestions; an applied suggestion fixes what it found and its finding does
 * not come back; every session a diff leaves stays within sets_per_session_per_muscle_min/max if it was (G1 K-10); no
 * suggestion leaves fewer training days than training_days_min (when the program had at least that many) or adds one.
 */
class ProgramReviewProperties {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static final List<String> MUSCLES = List.of("chest", "upper_back", "biceps", "triceps", "hamstrings", "quads", "calves");
    private static final int SESSION_MIN = P.wholeNumber(ParameterKey.SETS_PER_SESSION_PER_MUSCLE_MIN);
    private static final int SESSION_MAX = P.wholeNumber(ParameterKey.SETS_PER_SESSION_PER_MUSCLE_MAX);

    @Property
    void theSameProgramGivesTheSameSuggestions(@ForAll("programs") Program program, @ForAll("catalogs") Catalog catalog) {
        assertThat(ProgramReview.review(program, catalog, P)).isEqualTo(ProgramReview.review(program, catalog, P));
    }

    @Property
    void neverMoreThanTheCap(@ForAll("programs") Program program, @ForAll("catalogs") Catalog catalog) {
        assertThat(ProgramReview.review(program, catalog, P)).hasSizeLessThanOrEqualTo(P.wholeNumber(ParameterKey.REVIEW_MAX_SUGGESTIONS));
    }

    @Property
    void anAppliedSuggestionsFindingDoesNotComeBack(@ForAll("programs") Program program, @ForAll("catalogs") Catalog catalog) {
        // Every finding, not only the first three, so the lower priorities are exercised as often as the higher ones.
        for (Suggestion suggestion : ProgramReview.findings(program, catalog, P)) {
            Statistics.collect(suggestion.finding());
            Program after = ProgramReview.apply(program, suggestion);
            assertThat(ProgramReview.findings(after, catalog, P)).as(suggestion.toString()).noneMatch(other -> other.finding() == suggestion.finding()
                    && other.muscle().equals(suggestion.muscle()) && other.exercise().equals(suggestion.exercise()));
        }
    }

    @Property
    void anAppliedSuggestionFixesWhatItFound(@ForAll("programs") Program program, @ForAll("catalogs") Catalog catalog) {
        // Stronger than "the finding is gone": a finding also disappears when the review finds no diff for it.
        for (Suggestion suggestion : ProgramReview.findings(program, catalog, P)) {
            Program after = ProgramReview.apply(program, suggestion);
            String muscle = suggestion.muscle().orElse("");
            switch (suggestion.finding()) {
                case TOO_MANY_DAYS -> assertThat(trainingDays(after)).isLessThanOrEqualTo(P.wholeNumber(ParameterKey.TRAINING_DAYS_MAX));
                case TOO_MANY_SETS -> assertThat(after.weekly(muscle)).isLessThanOrEqualTo(P.wholeNumber(ParameterKey.WEEKLY_SETS_MAX));
                case TOO_FEW_SETS -> assertThat(after.weekly(muscle)).isGreaterThanOrEqualTo(Math.max(P.wholeNumber(ParameterKey.WEEKLY_SETS_MIN),
                        catalog.armMuscles().contains(muscle) ? P.wholeNumber(ParameterKey.ARM_WEEKLY_SETS_MIN) : 0));
                case ONCE_A_WEEK -> assertThat(after.days().stream().filter(day -> day.sets(muscle) > 0))
                        .hasSizeGreaterThanOrEqualTo(P.wholeNumber(ParameterKey.FREQUENCY_PER_MUSCLE_PER_WEEK));
                case REP_RANGE -> suggestion.changes().forEach(change -> {
                    SetRepRange range = (SetRepRange) change;
                    Move move = after.days().get(range.day()).moves().get(range.position());
                    boolean compound = move.kind() == LiftKind.COMPOUND;
                    assertThat(move.repMin()).isGreaterThanOrEqualTo(P.wholeNumber(compound ? ParameterKey.REP_RANGE_COMPOUND_MIN : ParameterKey.REP_RANGE_ISOLATION_MIN));
                    assertThat(move.repMax()).isLessThanOrEqualTo(P.wholeNumber(compound ? ParameterKey.REP_RANGE_COMPOUND_MAX : ParameterKey.REP_RANGE_ISOLATION_MAX));
                });
            }
        }
    }

    @Property
    void everySessionInsideTheLimitsStaysInsideThemOrGoes(@ForAll("programs") Program program, @ForAll("catalogs") Catalog catalog) {
        for (Suggestion suggestion : ProgramReview.findings(program, catalog, P)) {
            Program after = ProgramReview.apply(program, suggestion);
            Set<Integer> removed = suggestion.changes().stream().filter(RemoveDay.class::isInstance).map(c -> ((RemoveDay) c).day())
                    .collect(Collectors.toSet());
            int a = 0;
            for (int d = 0; d < program.days().size(); d++) {
                if (removed.contains(d)) {
                    continue;
                }
                Day before = program.days().get(d);
                Day now = after.days().get(a++);
                Set<String> muscles = new TreeSet<>();
                before.moves().forEach(m -> muscles.add(m.muscle()));
                now.moves().forEach(m -> muscles.add(m.muscle()));
                for (String muscle : muscles) {
                    int was = before.sets(muscle);
                    int is = now.sets(muscle);
                    if (was == 0 || within(was)) {
                        assertThat(is == 0 || within(is)).as(suggestion + ": day " + d + " " + muscle + " " + was + " → " + is).isTrue();
                    }
                }
            }
        }
    }

    @Property
    void noSuggestionLeavesTooFewDaysOrAddsOne(@ForAll("programs") Program program, @ForAll("catalogs") Catalog catalog) {
        int before = trainingDays(program);
        int floor = Math.min(before, P.wholeNumber(ParameterKey.TRAINING_DAYS_MIN));
        for (Suggestion suggestion : ProgramReview.findings(program, catalog, P)) {
            int after = trainingDays(ProgramReview.apply(program, suggestion));
            assertThat(after).as(suggestion.toString()).isBetween(floor, before);
        }
    }

    private static boolean within(int sets) {
        return sets >= SESSION_MIN && sets <= SESSION_MAX;
    }

    private static int trainingDays(Program program) {
        return (int) program.days().stream().filter(day -> !day.moves().isEmpty()).count();
    }

    @Provide
    Arbitrary<Program> programs() {
        Arbitrary<Move> move = Combinators.combine(Arbitraries.integers().between(0, 11), Arbitraries.of(MUSCLES),
                Arbitraries.of(LiftKind.values()), Arbitraries.integers().between(1, 8), Arbitraries.integers().between(1, 15),
                Arbitraries.integers().between(0, 6))
                .as((exercise, muscle, kind, sets, repMin, width) -> new Move(muscle + "_" + exercise % 3, muscle, kind, sets, repMin,
                        repMin + width));
        // Empty days and the same exercise more than once in a day or a week are part of the domain.
        return move.list().ofMaxSize(7).map(Day::new).list().ofMaxSize(8).map(Program::new);
    }

    @Provide
    Arbitrary<Catalog> catalogs() {
        // Candidates are sometimes a move already in the program (muscle_0), sometimes a new one.
        Arbitrary<String> suffix = Arbitraries.of("_0", "_isolation");
        return Combinators.combine(Arbitraries.subsetOf(MUSCLES), suffix, Arbitraries.subsetOf(MUSCLES))
                .as((muscles, end, arms) -> new Catalog(muscles.stream().collect(Collectors.toMap(m -> m, m -> m + end)),
                        arms));
    }
}
