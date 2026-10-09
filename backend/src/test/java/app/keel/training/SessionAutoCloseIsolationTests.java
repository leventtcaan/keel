package app.keel.training;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import app.keel.shared.AccountId;
import java.io.IOException;
import java.io.Reader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.scheduling.support.CronExpression;
import org.yaml.snakeyaml.Yaml;

/**
 * The close across accounts without a database (ADR-075 #5): the store and the progress stubbed. A session that cannot
 * be closed keeps no later one open; the first failure is raised to the scheduler's handler (BackgroundFailures), each
 * later one is logged where it happens — by type and code location only, never its message (V3, SafeLog).
 */
@ExtendWith(OutputCaptureExtension.class)
class SessionAutoCloseIsolationTests {

    private static final Instant NOW = Instant.parse("2026-10-07T12:00:00Z");

    /** The failures carry words a log must never repeat: what a message may hold. */
    private static final String SECRET = "left shoulder 82.4 kg";

    @Test
    void aSessionThatCannotCloseKeepsNoOtherOpenAndItsFailureIsRaised(CapturedOutput output) {
        List<WorkoutStore.Owned> due = List.of(open(), open(), open(), open());
        Set<UUID> failing = Set.of(due.get(1).workout().id(), due.get(3).workout().id());
        List<UUID> closed = new ArrayList<>();
        SessionAutoClose autoClose = new SessionAutoClose(store(due), progress(failing, closed), Clock.fixed(NOW, ZoneOffset.UTC));

        Throwable raised = catchThrowable(() -> autoClose.closeDue(NOW));

        assertThat(closed).containsExactly(due.get(0).workout().id(), due.get(2).workout().id());
        assertThat(raised).isInstanceOf(IllegalStateException.class);
        // The second failure is not lost behind the first: logged by itself, with where it was thrown and nothing it said.
        assertThat(output.getAll()).contains("task=app.keel.training.SessionAutoClose#closeDue")
                .contains("exception=java.lang.UnsupportedOperationException").doesNotContain(SECRET);
    }

    @Test
    void withNothingFailingNothingIsRaised() {
        List<WorkoutStore.Owned> due = List.of(open(), open());
        List<UUID> closed = new ArrayList<>();

        new SessionAutoClose(store(due), progress(Set.of(), closed), Clock.fixed(NOW, ZoneOffset.UTC)).closeDue(NOW);

        assertThat(closed).containsExactly(due.get(0).workout().id(), due.get(1).workout().id());
    }

    @Test
    @SuppressWarnings("unchecked")
    void theProductionScheduleIsACronSpringCanRun() throws IOException {
        // main application.yml, not the tests' (which turn it off with "-"): a cron Spring cannot parse stops the server.
        Map<String, Object> yaml;
        try (Reader reader = Files.newBufferedReader(Path.of("src/main/resources/application.yml"))) {
            yaml = new Yaml().load(reader);
        }
        String cron = (String) ((Map<String, Object>) ((Map<String, Object>) yaml.get("keel")).get("training")).get("session-auto-close");

        assertThat(cron).isNotEqualTo("-");
        assertThat(CronExpression.parse(cron).next(NOW.atZone(ZoneOffset.UTC))).isNotNull();
    }

    private static WorkoutStore.Owned open() {
        return new WorkoutStore.Owned(new AccountId(UUID.randomUUID()), new WorkoutStore.Workout(UUID.randomUUID(), UUID.randomUUID(),
                NOW.minusSeconds(200_000), null, UUID.randomUUID(), null, List.of(), null, 0));
    }

    private static WorkoutStore store(List<WorkoutStore.Owned> due) {
        return new WorkoutStore(null) {
            @Override
            List<Owned> unfinishedStartedBy(Instant startedBy) {
                return due;
            }
        };
    }

    /** Closes each session in turn; the first failing one throws one type, the second another. */
    private static SessionProgress progress(Set<UUID> failing, List<UUID> closed) {
        return new SessionProgress(null, null, null, null, null, null, null) {
            private int failures;

            @Override
            void closeUnfinished(AccountId account, WorkoutStore.Workout workout, Instant endedAt) {
                if (failing.contains(workout.id())) {
                    throw failures++ == 0 ? new IllegalStateException(SECRET) : new UnsupportedOperationException(SECRET);
                }
                closed.add(workout.id());
            }
        };
    }
}
