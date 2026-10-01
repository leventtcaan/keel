package app.keel.measurement;

import app.keel.shared.AccountDataExport;
import app.keel.consent.ConsentKind;
import app.keel.consent.ConsentWithdrawn;
import app.keel.shared.AccountDeletionRequested;
import app.keel.shared.AccountId;
import java.util.List;
import java.util.Map;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

/** Measurement's part of the user's data (K-214): every weigh-in, waist, photo check, activity day and look (levels, K-224). */
@Component
class MeasurementAccountData implements AccountDataExport {

    private static final List<String> TABLES = List.of("weigh_in", "waist", "photo_check", "activity_day", "body_look");

    private final JdbcClient jdbc;
    private final MeasurementStore store;

    MeasurementAccountData(JdbcClient jdbc, MeasurementStore store) {
        this.jdbc = jdbc;
        this.store = store;
    }

    @ApplicationModuleListener
    void on(AccountDeletionRequested deletion) {
        delete(deletion.account());
    }

    /** All of it is health data (K-231): in the withdrawal's transaction. */
    @EventListener
    void on(ConsentWithdrawn withdrawn) {
        if (withdrawn.kind() == ConsentKind.HEALTH_DATA) {
            delete(withdrawn.account());
        }
    }

    private void delete(AccountId account) {
        for (String table : TABLES) {
            jdbc.sql("delete from measurement." + table + " where account_id = :account").param("account", account.value()).update();
        }
    }

    @Override
    public String section() {
        return "measurement";
    }

    @Override
    public Object export(AccountId account) {
        return Map.of(
                "weighIns", store.weighIns(account),
                "waistMeasurements", store.waists(account),
                "photoChecks", store.photoChecks(account),
                "bodyLooks", store.bodyLooks(account),
                "activityDays", store.activityDays(account));
    }
}
