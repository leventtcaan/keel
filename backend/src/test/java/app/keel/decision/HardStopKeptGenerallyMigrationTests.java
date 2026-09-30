package app.keel.decision;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.persistence.PostgresTestConfiguration;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * V17 (K-228, ADR-028 #24): calls kept before K-228 named the hard stop by its own kind. The migration rewrites them as
 * the change of phase to building with the safety mark and the change-of-phase words — the form DecisionJson now keeps —
 * and leaves every other call as it was. Run here on a row in the old form, since the migration itself ran at start.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Import(PostgresTestConfiguration.class)
class HardStopKeptGenerallyMigrationTests {

    private static final Path V17 = Path.of("src/main/resources/db/migration/V17__decision_hard_stop_general_kind.sql");

    @Autowired
    JdbcClient jdbc;

    private UUID keep(String decision) {
        UUID id = UUID.randomUUID();
        jdbc.sql("""
                insert into decision.weekly_call (id, account_id, client_id, week_of, made_on, decided_at, parameters_hash, snapshot,
                    decision, application)
                values (:id, :account, :client, :week, :week, :at, 'h', cast('{}' as jsonb), cast(:decision as jsonb), 'PENDING')""")
                .param("id", id).param("account", UUID.randomUUID()).param("client", UUID.randomUUID())
                .param("week", LocalDate.of(2026, 9, 28)).param("at", OffsetDateTime.of(2026, 9, 28, 8, 0, 0, 0, ZoneOffset.UTC))
                .param("decision", decision).update();
        return id;
    }

    private String decision(UUID id) {
        return jdbc.sql("select decision::text from decision.weekly_call where id = :id").param("id", id).query(String.class).single();
    }

    @Test
    void anOldHardStopBecomesItsChangeOfPhaseWithTheSafetyMarkAndOtherCallsStayAsTheyWere() throws Exception {
        UUID old = keep("""
                {"action": {"type": "HARD_STOP"}, "reasons": [{"rule": "low_energy_safety", "source": {"reference": "arastirma/ham/J1-cinsiyet.md#C6", "tag": "LITERATURE"}}],
                 "confidence": "HIGH", "nextReview": "2026-10-05", "copyKey": "decision.hard_stop.low_energy_safety"}""");
        String other = """
                {"action": {"type": "CHANGE_PHASE", "to": "BULK"}, "reasons": [{"rule": "surplus_zone", "source": {"reference": "arastirma/03-guray-karar-omurgasi.md#2.4", "tag": "EXPERIENCE"}}],
                 "confidence": "MEDIUM", "nextReview": "2026-10-05", "copyKey": "decision.change_phase.surplus_zone"}""";
        UUID untouched = keep(other);
        String before = decision(untouched);

        jdbc.sql(Files.readString(V17)).update();

        String now = decision(old);
        assertThat(now).doesNotContainIgnoringCase("hard_stop")
                .contains("\"action\": {\"to\": \"BULK\", \"type\": \"CHANGE_PHASE\"}")
                .contains("\"safety\": true")
                .contains("\"copyKey\": \"decision.change_phase.low_energy_safety\"")
                .contains("low_energy_safety");
        assertThat(decision(untouched)).isEqualTo(before);
    }
}
