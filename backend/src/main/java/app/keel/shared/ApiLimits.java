package app.keel.shared;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * What any request may ask for (ADR-024 §13, keel.api): a range of at most max-range-days, and days and moments within
 * the years a person's data can have — outside them the database or the date arithmetic would fail, and a 500 makes
 * the offline phone retry forever. Every module checks its inputs against these.
 */
@ConfigurationProperties("keel.api")
public record ApiLimits(int maxRangeDays, int earliestYear, int latestYear) {

    /** from ≤ to, both within the years, fewer than max-range-days apart. */
    public boolean range(LocalDate from, LocalDate to) {
        return day(from) && day(to) && !to.isBefore(from) && ChronoUnit.DAYS.between(from, to) < maxRangeDays;
    }

    public boolean day(LocalDate day) {
        return day != null && day.getYear() >= earliestYear && day.getYear() <= latestYear;
    }

    /** Compared with the bounds only: no date arithmetic on a value that may be out of every range. */
    public boolean moment(Instant moment) {
        return moment != null && !moment.isBefore(LocalDate.of(earliestYear, 1, 1).atStartOfDay(ZoneOffset.UTC).toInstant())
                && moment.isBefore(LocalDate.of(latestYear + 1, 1, 1).atStartOfDay(ZoneOffset.UTC).toInstant());
    }
}
