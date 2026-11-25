package app.keel.nutrition;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/** Queues the folded text's backfill (SearchFoldBackfill) on the import thread after start, behind what the imports queued before it. */
@Component
@Order(3)
class SearchFoldRunner implements ApplicationRunner {

    private final SearchFoldBackfill backfill;
    private final FoodImportQueue queue;

    SearchFoldRunner(SearchFoldBackfill backfill, FoodImportQueue queue) {
        this.backfill = backfill;
        this.queue = queue;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (backfill.enabled() && !backfill.ready()) {
            queue.submit(() -> backfill.run());
        }
    }
}
