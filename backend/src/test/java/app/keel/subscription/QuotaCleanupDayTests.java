package app.keel.subscription;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import net.jqwik.api.ForAll;
import net.jqwik.api.Property;
import net.jqwik.api.constraints.IntRange;
import net.jqwik.api.constraints.LongRange;
import org.junit.jupiter.api.Test;

/**
 * The night's cut (K-532, ADR-043 #77): a count kept is the user's today or yesterday, on the user's own day. The job
 * reads no profile, so the cut must hold for every time zone at once — and still delete the day before yesterday of
 * the zone that is furthest behind.
 */
class QuotaCleanupDayTests {

    // The offsets a ZoneOffset allows, in seconds (-18:00 … +18:00); real zones lie inside (-12:00 … +14:00), some on
    // a quarter hour (+05:45).
    private static final int MOST_SECONDS = 18 * 3600;

    @Property
    void noTimeZonesTodayOrYesterdayIsEverCut(@ForAll @LongRange(min = 0, max = 4_102_444_800L) long epochSecond,
            @ForAll @IntRange(min = -MOST_SECONDS, max = MOST_SECONDS) int offsetSeconds) {
        Instant now = Instant.ofEpochSecond(epochSecond);
        ZoneOffset offset = ZoneOffset.ofTotalSeconds(offsetSeconds);

        assertThat(LocalDate.ofInstant(now, offset).minusDays(1)).as("yesterday at " + offset).isAfterOrEqualTo(QuotaCleanup.oldestKept(now));
    }

    @Property
    void theZoneFurthestBehindLosesItsDayBeforeYesterday(@ForAll @LongRange(min = 0, max = 4_102_444_800L) long epochSecond) {
        Instant now = Instant.ofEpochSecond(epochSecond);

        // Not a cut that keeps more than it must: the day before yesterday goes even where the calendar is furthest
        // behind, and nothing older than two days before UTC's today is ever kept.
        assertThat(LocalDate.ofInstant(now, ZoneOffset.MIN).minusDays(2)).isBefore(QuotaCleanup.oldestKept(now));
        assertThat(QuotaCleanup.oldestKept(now)).isAfterOrEqualTo(LocalDate.ofInstant(now, ZoneOffset.UTC).minusDays(2));
    }

    @Test
    void atUtcMidnightOnlyTheDaysBeforeTheEarliestYesterdayGo() {
        // 3 Oct 00:00 UTC: at -18:00 it is 2 Oct 06:00, so 1 Oct is the earliest yesterday; 30 Sep goes.
        assertThat(QuotaCleanup.oldestKept(Instant.parse("2026-10-03T00:00:00Z"))).isEqualTo(LocalDate.parse("2026-10-01"));
        // 3 Oct 17:59:59 UTC: still 2 Oct at -18:00.
        assertThat(QuotaCleanup.oldestKept(Instant.parse("2026-10-03T17:59:59Z"))).isEqualTo(LocalDate.parse("2026-10-01"));
        // 3 Oct 18:00 UTC: 3 Oct 00:00 at -18:00 — every zone is on 3 Oct or later; 2 Oct is the earliest yesterday.
        assertThat(QuotaCleanup.oldestKept(Instant.parse("2026-10-03T18:00:00Z"))).isEqualTo(LocalDate.parse("2026-10-02"));
    }
}
