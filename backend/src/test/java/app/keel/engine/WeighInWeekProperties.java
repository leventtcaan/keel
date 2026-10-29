package app.keel.engine;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.Combinators;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import net.jqwik.api.statistics.Statistics;

/**
 * This week's weigh-ins over any block (ADR-089 #1): the block is the seven days ending on the check-in day; a date is promised
 * exactly when the days weighed and the mornings left cannot reach the minimum; and that date is the review date the call
 * made on the same data would carry.
 */
class WeighInWeekProperties {

    private static final Parameters P = RepositoryParameters.forSex(Sex.MALE);
    private static final int NEEDED = P.wholeNumber(ParameterKey.MIN_WEIGHINS_PER_WEEK);
    private static final LocalDate CHECK_IN = LocalDate.of(2026, 11, 2);
    private static final LocalDate FROM = CHECK_IN.minusDays(6);
    private static final LocalDate LONG_AGO = LocalDate.of(2026, 6, 1);

    /** A day of the block as today, and which of the block's days up to it were weighed. */
    record Week(LocalDate today, List<LocalDate> weighed) {

        WeightSeries history() {
            List<WeighIn> weighIns = new ArrayList<>();
            for (LocalDate day = LONG_AGO; day.isBefore(FROM); day = day.plusDays(1)) {
                weighIns.add(new WeighIn(day, new BigDecimal("80.0")));
            }
            weighed.forEach(day -> weighIns.add(new WeighIn(day, new BigDecimal("80.0"))));
            return new WeightSeries(weighIns);
        }
    }

    @Property
    void aDateIsPromisedExactlyWhenTheMinimumCannotBeReached(@ForAll("weeks") Week week) {
        WeighInWeek result = WeighInWeek.of(week.today(), CHECK_IN, LONG_AGO, week.history(), P);

        long mornings = week.today().datesUntil(CHECK_IN.plusDays(1)).filter(day -> !week.weighed().contains(day)).count();
        boolean cannotReach = week.weighed().size() + mornings < NEEDED;
        Statistics.collect(cannotReach ? "short" : "reachable");
        assertThat(result.callsFrom().isPresent()).isEqualTo(cannotReach);
    }

    @Property
    void theBlockAndItsWeighedDaysAreTheUsersOwn(@ForAll("weeks") Week week) {
        WeighInWeek result = WeighInWeek.of(week.today(), CHECK_IN, LONG_AGO, week.history(), P);

        assertThat(result.from()).isEqualTo(FROM);
        assertThat(result.to()).isEqualTo(CHECK_IN);
        assertThat(result.needed()).isEqualTo(NEEDED);
        assertThat(result.weighedDays()).containsExactlyElementsOf(week.weighed().stream().sorted().toList());
    }

    @Property
    void theDateIsAfterTheCheckInAndTheSameAsTheCallsOwnReviewDate(@ForAll("weeks") Week week) {
        WeightSeries history = week.history();
        Optional<LocalDate> callsFrom = WeighInWeek.of(week.today(), CHECK_IN, LONG_AGO, history, P).callsFrom();
        Optional<Decision> call = DataSufficiency.check(new Snapshot(week.today(), Sex.MALE, Phase.CUT, LONG_AGO, history), P);

        callsFrom.ifPresent(day -> {
            // A short block fails the weekly check on the check-in day itself, so the data is not enough before it.
            assertThat(day).isAfter(CHECK_IN);
            // Where the call is a "no decision yet" today, its review date is this date.
            call.ifPresent(decision -> assertThat(decision.nextReview()).isEqualTo(day));
        });
    }

    @Provide
    Arbitrary<Week> weeks() {
        return Arbitraries.integers().between(0, 6).flatMap(inBlock -> {
            LocalDate today = FROM.plusDays(inBlock);
            return Combinators.combine(Arbitraries.just(today),
                    Arbitraries.of(FROM.datesUntil(today.plusDays(1)).toList()).set().ofMaxSize(inBlock + 1))
                    .as((day, weighed) -> new Week(day, weighed.stream().sorted().toList()));
        });
    }
}
