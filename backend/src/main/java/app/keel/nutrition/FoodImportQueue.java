package app.keel.nutrition;

import app.keel.shared.SafeLog;
import jakarta.annotation.PreDestroy;
import java.lang.reflect.Method;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.springframework.stereotype.Component;

/**
 * The big food imports (K-1061): USDA Branded (1.9 million products) and an Open Food Facts region run one after the other on a
 * thread of their own, after the application has started — the server answers while they run, and a deploy that restarts it
 * in the middle only stops the import, which every importer can resume (batches, stamped rows). A failure is logged as a
 * failure of this task (SafeLog: its type and place, never a value) and the next job still runs.
 */
@Component
class FoodImportQueue {

    private static final Method TASK = task();

    private final ExecutorService executor = Executors.newSingleThreadExecutor(job -> {
        Thread thread = new Thread(job, "food-import");
        thread.setDaemon(true);
        return thread;
    });

    /** Runs the job after those submitted before it. */
    void submit(Runnable job) {
        executor.execute(() -> {
            try {
                job.run();
            } catch (RuntimeException | Error failure) {
                SafeLog.backgroundFailure(TASK, failure);
            }
        });
    }

    @PreDestroy
    void stop() {
        executor.shutdownNow();
    }

    private static Method task() {
        try {
            return FoodImportQueue.class.getDeclaredMethod("submit", Runnable.class);
        } catch (NoSuchMethodException impossible) {
            throw new IllegalStateException(impossible);
        }
    }
}
