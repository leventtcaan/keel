package app.keel.training;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/**
 * "Fill in the rest later" (ADR-075 #5): a session left without a finish stays open — and counts in the week it started
 * (ADR-071 #3) — until unfinished_session_close_hours after its start (data/parameters/workout.json, the phone's file,
 * read as it is: one value). Then it closes by itself and its targets are set as a finish sets them (K-217).
 *
 * <p>The end it gets is its start. Sets carry no times, so no later end is known; an end hours after the start would be
 * a session hours long the user never trained (a days-long workout is what the phone keeps out of Apple Health, K-412).
 * The import gives an end it is not told the same way (K-615). Sets filled in after the close still count: a finished
 * session's edit derives its targets again (K-432), and a finish the user sends later replaces this end.
 */
@Component
class SessionAutoClose {

    private static final String FILE = "data/parameters/workout.json";
    private static final String KEY = "unfinished_session_close_hours";

    private final WorkoutStore workouts;
    private final SessionProgress progress;
    private final Clock clock;
    private final Duration closeAfter;

    SessionAutoClose(WorkoutStore workouts, SessionProgress progress, Clock clock) {
        this.workouts = workouts;
        this.progress = progress;
        this.clock = clock;
        this.closeAfter = closeAfterFromClasspath();
    }

    // @Async: the scheduler's own handler would log the failure's message; run as a listener does, a failure goes to
    // BackgroundFailures — which task, its type and where, never the message (V3).
    @Scheduled(cron = "${keel.training.session-auto-close}")
    @Async
    void scheduled() {
        closeDue(clock.instant());
    }

    /**
     * Closes every session, of any account, still open {@code closeAfter} after it started — each on its own account, in
     * its own transaction (SessionProgress.closeUnfinished), so one the user finishes meanwhile is left as they finished
     * it. Run again, it finds nothing more to do. A session that cannot be closed keeps no later one open: the rest are
     * closed, then its failure is raised.
     */
    void closeDue(Instant now) {
        RuntimeException failed = null;
        for (WorkoutStore.Owned open : workouts.unfinishedStartedBy(now.minus(closeAfter))) {
            try {
                progress.closeUnfinished(open.account(), open.workout(), open.workout().startedAt());
            } catch (RuntimeException failure) {
                if (failed == null) {
                    failed = failure;
                } else {
                    failed.addSuppressed(failure);
                }
            }
        }
        if (failed != null) {
            throw failed;
        }
    }

    static Duration closeAfterFromClasspath() {
        try (InputStream in = new ClassPathResource(FILE).getInputStream()) {
            return closeAfter(in);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** The hours from the file; a value that is not a whole number of at least one stops the server from starting. */
    @SuppressWarnings("unchecked")
    static Duration closeAfter(InputStream json) {
        List<Map<String, Object>> parameters = (List<Map<String, Object>>) JsonMapper.builder().build().readValue(json, Map.class).get("parameters");
        return parameters.stream().filter(parameter -> KEY.equals(parameter.get("key"))).map(parameter -> parameter.get("value"))
                .filter(value -> value instanceof Integer hours && hours >= 1).map(hours -> Duration.ofHours((Integer) hours)).findFirst()
                .orElseThrow(() -> new IllegalStateException("workout.json: " + KEY + " is missing or not a whole number of hours of at least 1"));
    }
}
