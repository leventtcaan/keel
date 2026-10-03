package app.keel.training;

import java.time.Instant;

/**
 * A program in force from {@code from} until the next one (K-535, ADR-045 #79): the sessions a week it asked — one a
 * program day, as {@link TrainingStatusReader#programSessionsPerWeek}.
 */
public record ProgramPeriod(Instant from, int sessionsPerWeek) {
}
