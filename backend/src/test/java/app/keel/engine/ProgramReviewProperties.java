package app.keel.engine;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.engine.ProgramReview.Day;
import app.keel.engine.ProgramReview.Finding;
import app.keel.engine.ProgramReview.Move;
import app.keel.engine.ProgramReview.Program;
import app.keel.engine.ProgramReview.SetRepRange;
import app.keel.engine.ProgramReview.Suggestion;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import net.jqwik.api.statistics.Statistics;

/**
 * Program review over any program (K-955, ADR-073 #2): the same program gives the same suggestions; never more than
 * review_max_suggestions; an applied suggestion fixes what it found and its finding does not come back; no suggestion leaves
 * fewer days than training_days_min (when the program had at least that many) or more days than before.
 */
class ProgramReviewProperties {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static final List<String> MUSCLES = List.of("chest", "upper_back", "biceps", "triceps", "hamstrings", "quads", "calves");

    @Property
    void theSameProgramGivesTheSameSuggestions(@ForAll("programs") Program program, @ForAll("candidates") Map<String, String> candidates) {
        assertThat(ProgramReview.review(program, candidates, P)).isEqualTo(ProgramReview.review(program, candidates, P));
    }

    @Property
    void neverMoreThanTheCap(@ForAll("programs") Program program, @ForAll("candidates") Map<String, String> candidates) {
        assertThat(ProgramReview.review(program, candidates, P)).hasSizeLessThanOrEqualTo(P.wholeNumber(ParameterKey.REVIEW_MAX_SUGGESTIONS));
    }

    @Property
    void anAppliedSuggestionsFindingDoesNotComeBack(@ForAll("programs") Program program,
            @ForAll("candidates") Map<String, String> candidates) {
        // Every finding, not only the first three, so the lower priorities are exercised as often as the higher ones.
        for (Suggestion suggestion : ProgramReview.findings(program, candidates, P)) {
            Statistics.collect(suggestion.finding());
            Program after = ProgramReview.apply(program, suggestion);
            assertThat(ProgramReview.findings(after, candidates, P)).as(suggestion.toString()).noneMatch(other -> sameFinding(suggestion, other));
        }
    }

    @Property
    void anAppliedSuggestionFixesWhatItFound(@ForAll("programs") Program program, @ForAll("candidates") Map<String, String> candidates) {
        // Stronger than "the finding is gone": a finding also disappears when the review finds no diff for it.
        for (Suggestion suggestion : ProgramReview.findings(program, candidates, P)) {
            Program after = ProgramReview.apply(program, suggestion);
            String muscle = suggestion.muscle().orElse("");
            switch (suggestion.finding()) {
                case TOO_MANY_DAYS -> assertThat(after.days()).hasSizeLessThanOrEqualTo(P.wholeNumber(ParameterKey.TRAINING_DAYS_MAX));
                case TOO_MANY_SETS -> assertThat(weekly(after, muscle)).isLessThanOrEqualTo(P.wholeNumber(ParameterKey.WEEKLY_SETS_MAX));
                case TOO_FEW_SETS -> assertThat(weekly(after, muscle)).isGreaterThanOrEqualTo(Math.max(P.wholeNumber(ParameterKey.WEEKLY_SETS_MIN),
                        ProgramReview.ARM_MUSCLES.contains(muscle) ? P.wholeNumber(ParameterKey.ARM_WEEKLY_SETS_MIN) : 0));
                case ONCE_A_WEEK -> assertThat(after.days().stream().filter(day -> day.moves().stream().anyMatch(m -> m.muscle().equals(muscle))))
                        .hasSizeGreaterThanOrEqualTo(P.wholeNumber(ParameterKey.FREQUENCY_PER_MUSCLE_PER_WEEK));
                case REP_RANGE -> {
                    SetRepRange range = (SetRepRange) suggestion.changes().getFirst();
                    Move move = after.days().get(range.day()).moves().get(range.position());
                    boolean compound = move.kind() == LiftKind.COMPOUND;
                    assertThat(move.repMin()).isGreaterThanOrEqualTo(P.wholeNumber(compound ? ParameterKey.REP_RANGE_COMPOUND_MIN : ParameterKey.REP_RANGE_ISOLATION_MIN));
                    assertThat(move.repMax()).isLessThanOrEqualTo(P.wholeNumber(compound ? ParameterKey.REP_RANGE_COMPOUND_MAX : ParameterKey.REP_RANGE_ISOLATION_MAX));
                }
            }
        }
    }

    private static int weekly(Program program, String muscle) {
        return program.days().stream().flatMap(day -> day.moves().stream()).filter(m -> m.muscle().equals(muscle)).mapToInt(Move::sets).sum();
    }

    @Property
    void noSuggestionLeavesTooFewDaysOrAddsOne(@ForAll("programs") Program program, @ForAll("candidates") Map<String, String> candidates) {
        int before = program.days().size();
        int floor = Math.min(before, P.wholeNumber(ParameterKey.TRAINING_DAYS_MIN));
        for (Suggestion suggestion : ProgramReview.findings(program, candidates, P)) {
            int after = ProgramReview.apply(program, suggestion).days().size();
            assertThat(after).as(suggestion.toString()).isBetween(floor, before);
        }
    }

    private static boolean sameFinding(Suggestion a, Suggestion b) {
        return a.finding() == b.finding() && a.muscle().equals(b.muscle()) && a.exercise().equals(b.exercise())
                && place(a).equals(place(b));
    }

    // A rep range finding is about one move: the same exercise elsewhere in the week is another finding.
    private static Optional<List<Integer>> place(Suggestion suggestion) {
        if (suggestion.finding() != Finding.REP_RANGE) {
            return Optional.empty();
        }
        SetRepRange range = (SetRepRange) suggestion.changes().getFirst();
        return Optional.of(List.of(range.day(), range.position()));
    }

    @Provide
    Arbitrary<Program> programs() {
        Arbitrary<Move> move = Combinators.combine(Arbitraries.integers().between(0, 11), Arbitraries.of(MUSCLES),
                Arbitraries.of(LiftKind.values()), Arbitraries.integers().between(1, 8), Arbitraries.integers().between(1, 15),
                Arbitraries.integers().between(0, 6))
                .as((exercise, muscle, kind, sets, repMin, width) -> new Move(muscle + "_" + exercise % 3, muscle, kind, sets, repMin,
                        repMin + width));
        return move.list().ofMinSize(1).ofMaxSize(7).map(Day::new).list().ofMinSize(1).ofMaxSize(7).map(Program::new);
    }

    @Provide
    Arbitrary<Map<String, String>> candidates() {
        return Arbitraries.subsetOf(MUSCLES).map(muscles -> muscles.stream()
                .collect(Collectors.toMap(muscle -> muscle, muscle -> muscle + "_isolation")));
    }
}
