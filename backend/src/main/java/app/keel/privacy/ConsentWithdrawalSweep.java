package app.keel.privacy;

import java.time.Instant;
import org.springframework.stereotype.Component;

/** The second pass of a consent withdrawal's deletion (K-231). */
@Component
class ConsentWithdrawalSweep {

    void sweep(Instant now) {
    }
}
