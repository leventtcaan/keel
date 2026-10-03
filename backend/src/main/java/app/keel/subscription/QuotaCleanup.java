package app.keel.subscription;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Yesterday's counts go each night (K-532, ADR-043 #77): the quota reads only today's count and gives a use back to the
 * day it was taken on (yesterday, for a call across midnight), so an older count is data kept for no purpose — and
 * one more line in the user's export. The days are the users' own (Quota), but the cut reads no profile: it keeps
 * every day from the earliest yesterday any time zone can be on, so no zone ever loses its today or its yesterday.
 */
@Component
class QuotaCleanup {

    private final JdbcClient jdbc;
    private final Clock clock;

    QuotaCleanup(JdbcClient jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    // @Async: the scheduler's own handler would log the failure's message; run as a listener does, a failure goes to
    // BackgroundFailures — which task, its type and where, never the message (V3).
    @Scheduled(cron = "${keel.subscription.quota-cleanup}")
    @Async
    void nightly() {
        cleanUp(clock.instant());
    }

    /** Deletes every count of a day before {@link #oldestKept}. */
    void cleanUp(Instant now) {
        jdbc.sql("delete from subscription.daily_use where day < :oldestKept").param("oldestKept", oldestKept(now)).update();
    }

    /**
     * Yesterday where the calendar is furthest behind: ZoneOffset.MIN (-18:00) is the earliest offset a time zone can
     * have (real ones stop at -12:00), so every user's yesterday is this day or later.
     */
    static LocalDate oldestKept(Instant now) {
        return LocalDate.ofInstant(now, ZoneOffset.MIN).minusDays(1);
    }
}
