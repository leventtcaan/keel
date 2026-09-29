package app.keel.privacy;

import app.keel.shared.AccountDataExport;
import app.keel.shared.AccountDeletionRequested;
import app.keel.shared.AccountId;
import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * The contract's /v1/account (K-214, V6): delete everything, or take everything out. Deletion is an event every
 * module handles for its own data after this transaction commits; the event registry keeps it until each has, so a
 * restart in between does not leave data behind (ADR-023).
 */
@RestController
class AccountController {

    /** Contract AccountExport. */
    record Export(Instant exportedAt, Map<String, Object> sections) {
    }

    private final ApplicationEventPublisher events;
    private final List<AccountDataExport> exports;
    private final Clock clock;

    AccountController(ApplicationEventPublisher events, List<AccountDataExport> exports, Clock clock) {
        this.events = events;
        this.exports = exports;
        this.clock = clock;
    }

    @DeleteMapping("/v1/account")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Transactional
    void delete(AccountId account) {
        events.publishEvent(new AccountDeletionRequested(account));
    }

    @GetMapping("/v1/account/export")
    Export export(AccountId account) {
        Map<String, Object> sections = new LinkedHashMap<>();
        exports.stream().sorted(Comparator.comparing(AccountDataExport::section))
                .forEach(module -> sections.put(module.section(), module.export(account)));
        return new Export(clock.instant(), sections);
    }
}
