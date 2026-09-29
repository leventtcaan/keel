package app.keel.engine;

import static app.keel.engine.EngineFixtures.parameters;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import net.jqwik.api.Arbitraries;
import net.jqwik.api.Arbitrary;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.Provide;
import org.junit.jupiter.api.Test;

/**
 * The daily number (U15): consistency. Weekly, cumulative, never reset, one missed week forgiven (U7; 04-faz3 §7.3:
 * gym data's one-week tolerance, Lally 2010, Duolingo's streak freeze). A week is on track at on_track_min_ratio of
 * its planned actions (Güray G2 K-60: 70 % of the plan is success). The week follows the user's home time zone, so
 * travel never shifts it (L3 P13).
 */
class ConsistencyTests {

    private static final Parameters P = parameters(Sex.MALE);
    private static final LocalDate MONDAY = LocalDate.of(2026, 9, 7);

    // ── one week ────────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void aWeeksRatioIsDoneOverPlanned() {
        // 4 sessions + 7 protein days + 7 step days + 7 weigh-ins = 25 planned; 20 done → 0.8.
        assertThat(Consistency.weekRatio(new WeekTally(MONDAY, 25, 20))).isEqualByComparingTo("0.8");
    }

    @Test
    void doingMoreThanPlannedCountsAsAFullWeekNotMore() {
        assertThat(Consistency.weekRatio(new WeekTally(MONDAY, 4, 6))).isEqualByComparingTo("1");
    }

    @Test
    void aWeekExactlyAtTheLineIsOnTrack() {
        // 7 of 10 = 0.7 = on_track_min_ratio (at the line counts); 6 of 10 does not.
        assertThat(record(week(10, 7)).onTrackWeeks()).isEqualTo(1);
        assertThat(record(week(10, 6)).onTrackWeeks()).isZero();
    }

    // ── the counter ─────────────────────────────────────────────────────────────────────────────────────────

    @Test
    void theCounterIsCumulativeNineOfTwelve() {
        List<WeekTally> twelve = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            twelve.add(new WeekTally(MONDAY.plusWeeks(i), 10, i % 4 == 3 ? 3 : 9)); // weeks 4, 8, 12 off
        }

        ConsistencyRecord record = Consistency.record(twelve, P);

        assertThat(record.onTrackWeeks()).isEqualTo(9);
        assertThat(record.countedWeeks()).isEqualTo(12);
    }

    @Test
    void aForgivenWeekKeepsTheRunGoing() {
        // on, on, off, on → the lone missed week is forgiven: the run is 3 on-track weeks, cumulative 3 of 4.
        ConsistencyRecord record = record(week(10, 9), week(10, 9), week(10, 2), week(10, 9));

        assertThat(record.currentRun()).isEqualTo(3);
        assertThat(record.onTrackWeeks()).isEqualTo(3);
        assertThat(record.countedWeeks()).isEqualTo(4);
    }

    @Test
    void twoMissedWeeksInARowEndTheRunButNeverTheCounter() {
        // on, on, off, off, on → the run restarts at 1; the cumulative count keeps all 3 on-track weeks (U7: no reset).
        ConsistencyRecord record = record(week(10, 9), week(10, 9), week(10, 2), week(10, 1), week(10, 9));

        assertThat(record.currentRun()).isEqualTo(1);
        assertThat(record.onTrackWeeks()).isEqualTo(3);
        assertThat(record.countedWeeks()).isEqualTo(5);
    }

    @Test
    void aWeekWithNothingPlannedIsLeftOut() {
        // A holiday week with no plan is neither a success nor a miss.
        ConsistencyRecord record = record(week(10, 9), week(0, 0), week(10, 9));

        assertThat(record.countedWeeks()).isEqualTo(2);
        assertThat(record.currentRun()).isEqualTo(2);
    }

    @Test
    void refusesMalformedWeeks() {
        assertThatThrownBy(() -> new WeekTally(MONDAY, -1, 0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new WeekTally(MONDAY, 5, -1)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new WeekTally(MONDAY.plusDays(1), 5, 1)).isInstanceOf(IllegalArgumentException.class);
        // Weeks come oldest first, one per week; two tallies for the same week are a caller bug.
        assertThatThrownBy(() -> Consistency.record(List.of(week(10, 9), week(10, 9)), P))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ── the week boundary ───────────────────────────────────────────────────────────────────────────────────

    @Test
    void theWeekFollowsTheHomeTimeZone() {
        // Sunday 22:30 UTC. At home in Istanbul (+3) it is already Monday 01:30 → the new week.
        // At home in New York (−4) it is still Sunday 18:30 → the old week. Where the phone is does not matter.
        Instant lateSundayUtc = Instant.parse("2026-10-25T22:30:00Z");

        assertThat(Consistency.weekStartOf(lateSundayUtc, ZoneId.of("Europe/Istanbul"))).isEqualTo(LocalDate.of(2026, 10, 26));
        assertThat(Consistency.weekStartOf(lateSundayUtc, ZoneId.of("America/New_York"))).isEqualTo(LocalDate.of(2026, 10, 19));
    }

    @Property
    boolean everyMomentFallsInTheMondayWeekThatContainsItsHomeDate(@ForAll("moments") Instant moment, @ForAll("zones") ZoneId home) {
        LocalDate weekStart = Consistency.weekStartOf(moment, home);
        LocalDate homeDate = moment.atZone(home).toLocalDate();
        return weekStart.getDayOfWeek() == DayOfWeek.MONDAY && !homeDate.isBefore(weekStart) && homeDate.isBefore(weekStart.plusDays(7));
    }

    // ── properties of the counter ───────────────────────────────────────────────────────────────────────────

    @Property
    boolean theCounterNeverGoesDownAsWeeksAreAdded(@ForAll("tallies") List<int[]> history) {
        // U7: nothing already earned is ever taken away.
        int previous = 0;
        List<WeekTally> weeks = new ArrayList<>();
        for (int i = 0; i < history.size(); i++) {
            weeks.add(new WeekTally(MONDAY.plusWeeks(i), history.get(i)[0], history.get(i)[1]));
            int now = Consistency.record(weeks, P).onTrackWeeks();
            if (now < previous) {
                return false;
            }
            previous = now;
        }
        return true;
    }

    @Property
    boolean theRunNeverExceedsTheOnTrackWeeks(@ForAll("tallies") List<int[]> history) {
        List<WeekTally> weeks = new ArrayList<>();
        for (int i = 0; i < history.size(); i++) {
            weeks.add(new WeekTally(MONDAY.plusWeeks(i), history.get(i)[0], history.get(i)[1]));
        }
        ConsistencyRecord record = Consistency.record(weeks, P);
        return record.currentRun() <= record.onTrackWeeks() && record.onTrackWeeks() <= record.countedWeeks();
    }

    @Provide
    Arbitrary<List<int[]>> tallies() {
        return Arbitraries.integers().between(0, 30).flatMap(planned -> Arbitraries.integers().between(0, 35)
                .map(done -> new int[] {planned, done})).list().ofMaxSize(30);
    }

    @Provide
    Arbitrary<Instant> moments() {
        return Arbitraries.longs().between(Instant.parse("2020-01-01T00:00:00Z").getEpochSecond(),
                Instant.parse("2035-01-01T00:00:00Z").getEpochSecond()).map(Instant::ofEpochSecond);
    }

    @Provide
    Arbitrary<ZoneId> zones() {
        return Arbitraries.of("Europe/Istanbul", "America/New_York", "Pacific/Kiritimati", "Pacific/Pago_Pago",
                "Asia/Kathmandu", "Australia/Lord_Howe", "UTC").map(ZoneId::of);
    }

    // ── helpers ─────────────────────────────────────────────────────────────────────────────────────────────

    private static WeekTally week(int planned, int done) {
        return new WeekTally(MONDAY, planned, done); // dates are filled in order by record(...)
    }

    private static ConsistencyRecord record(WeekTally... weeks) {
        List<WeekTally> dated = new ArrayList<>();
        for (int i = 0; i < weeks.length; i++) {
            dated.add(new WeekTally(MONDAY.plusWeeks(i), weeks[i].planned(), weeks[i].done()));
        }
        return Consistency.record(dated, P);
    }
}
