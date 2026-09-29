package app.keel.measurement;

import app.keel.shared.AccountDataExport;
import app.keel.shared.AccountDeletionRequested;
import app.keel.shared.AccountId;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

/** Measurement's part of the user's data (K-214): every weigh-in, waist, photo check and activity day. */
@Component
class MeasurementAccountData implements AccountDataExport {

    private static final List<String> TABLES = List.of("weigh_in", "waist", "photo_check", "activity_day");

    private final JdbcClient jdbc;
    private final MeasurementStore store;

    MeasurementAccountData(JdbcClient jdbc, MeasurementStore store) {
        this.jdbc = jdbc;
        this.store = store;
    }

    @ApplicationModuleListener
    void on(AccountDeletionRequested deletion) {
        for (String table : TABLES) {
            jdbc.sql("delete from measurement." + table + " where account_id = :account").param("account", deletion.account().value()).update();
        }
    }

    @Override
    public String section() {
        return "measurement";
    }

    @Override
    public Object export(AccountId account) {
        return Map.of(
                "weighIns", store.weighIns(account, Instant.EPOCH, Instant.parse("9999-12-31T00:00:00Z")),
                "waistMeasurements", store.waists(account, LocalDate.of(1, 1, 1), LocalDate.of(9999, 12, 31)),
                "photoChecks", store.photoChecks(account),
                "activityDays", store.activityDays(account));
    }
}
