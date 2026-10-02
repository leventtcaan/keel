package app.keel.privacy;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.identity.TestSessions;
import app.keel.shared.AccountId;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import org.springframework.context.ApplicationContext;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * An account as a real one would be — signed in through Apple, then data in every module — and a count of its rows in
 * every table that has an account_id column, read from the database itself so that a module added later is covered
 * (K-214, K-231).
 */
final class AccountFixture {

    static final JsonMapper JSON = JsonMapper.builder().build();

    private final MockMvcTester mvc;
    private final ApplicationContext context;
    private final JdbcClient jdbc;

    AccountFixture(MockMvcTester mvc, ApplicationContext context, JdbcClient jdbc) {
        this.mvc = mvc;
        this.context = context;
        this.jdbc = jdbc;
    }

    AccountId withDataEverywhere() throws Exception {
        AccountId account = new AccountId(UUID.fromString(jdbc.sql("""
                insert into identity.account (id, apple_subject, created_at) values (gen_random_uuid(), :subject, now()) returning id""")
                .param("subject", "apple." + UUID.randomUUID()).query(String.class).single()));
        jdbc.sql("""
                insert into identity.refresh_token (id, account_id, family_id, token_hash, expires_at, created_at)
                values (gen_random_uuid(), :account, gen_random_uuid(), :hash, now() + interval '1 day', now())""")
                .param("account", account.value()).param("hash", UUID.randomUUID().toString()).update();
        send(account, "PUT", "/v1/consents/HEALTH_DATA", Map.of("textVersion", "1-draft"));
        send(account, "PUT", "/v1/profile", Map.of("goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996,
                "programChoice", "BUILD_ONE_FOR_ME", "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC"),
                "food", Map.of("avoid", List.of("peanuts"), "budgetNote", "student budget")));
        send(account, "POST", "/v1/weigh-ins", Map.of("clientId", UUID.randomUUID(), "measuredAt", "2026-09-30T05:00:00Z", "kg", 82.4,
                "source", "MANUAL"));
        send(account, "POST", "/v1/waist-measurements", Map.of("clientId", UUID.randomUUID(), "measuredOn", "2026-09-30", "cm", 88));
        send(account, "POST", "/v1/photo-checks", Map.of("clientId", UUID.randomUUID(), "takenOn", "2026-09-30", "look", "SAME"));
        send(account, "POST", "/v1/body-looks", Map.of("clientId", UUID.randomUUID(), "takenOn", "2026-09-30", "level", 3));
        send(account, "PUT", "/v1/activity-days", Map.of("day", "2026-09-30", "steps", 8000));
        send(account, "POST", "/v1/program/generate", Map.of("trainingDays", List.of("MONDAY", "THURSDAY")));
        // A gym with every part of its equipment (K-414): its plates, dumbbells and machines are rows too.
        send(account, "PUT", "/v1/gyms/" + UUID.randomUUID(), Map.of("name", "Downtown", "current", true, "barKg", 20, "platesKg", List.of(20, 10),
                "dumbbellsKg", List.of(10, 12), "stackStepKg", 5, "machines", List.of(Map.of("exerciseId", "pec_deck", "stepKg", 7))));
        // A call of the deload ladder on the program (K-217), as decision applies it.
        context.getBean(app.keel.training.TrainingCalls.class).holdLoad(account, UUID.randomUUID(), LocalDate.of(2026, 9, 28));
        jdbc.sql("insert into nutrition.food (id, name, source, kcal, protein_g, carbs_g, fat_g) values ('fdc:171477', 'Chicken breast, roasted', 'FOUNDATION', 165, 31, 0, 3.6) on conflict (id) do nothing").update();
        send(account, "POST", "/v1/meals", Map.of("clientId", UUID.randomUUID(), "eatenAt", "2026-09-30T12:30:00Z", "slot", "LUNCH",
                "items", List.of(Map.of("foodId", "fdc:171477", "amount", Map.of("quantity", 200, "unit", "g")))));
        // A recipe and its ingredients (K-413): health data, as meals are.
        send(account, "POST", "/v1/recipes", Map.of("clientId", UUID.randomUUID(), "name", "Chicken bowl", "portions", 2,
                "items", List.of(Map.of("foodId", "fdc:171477", "amount", Map.of("quantity", 300, "unit", "g")))));
        // This week's check-in (Mondays, UTC): the plan and the call (K-212).
        send(account, "POST", "/v1/check-ins/current/answers", Map.of("clientId", UUID.randomUUID(), "answers", List.of(),
                "weekOf", LocalDate.now(ZoneOffset.UTC).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).toString()));
        MvcTestResult workout = send(account, "POST", "/v1/workouts", Map.of("clientId", UUID.randomUUID(), "startedAt", "2026-09-30T15:00:00Z"));
        String id = (String) JSON.readValue(workout.getResponse().getContentAsString(), Map.class).get("id");
        send(account, "POST", "/v1/workouts/" + id + "/sets", Map.of("clientId", UUID.randomUUID(), "exerciseId", "bench_press",
                "setType", "WORKING", "loadKg", 80, "reps", 8, "rir", 1));
        return account;
    }

    /** Rows per schema.table with an account_id column, for this account. */
    Map<String, Integer> rowsOf(AccountId account) {
        List<String> tables = jdbc.sql("""
                select table_schema || '.' || table_name from information_schema.columns
                where column_name = 'account_id' and table_schema not in ('public', 'pg_catalog', 'information_schema')
                order by 1""").query(String.class).list();
        Map<String, Integer> rows = new TreeMap<>();
        for (String table : tables) {
            rows.put(table, jdbc.sql("select count(*) from " + table + " where account_id = :account")
                    .param("account", account.value()).query(Integer.class).single());
        }
        // identity.account is keyed by id, not account_id.
        rows.put("identity.account", jdbc.sql("select count(*) from identity.account where id = :account")
                .param("account", account.value()).query(Integer.class).single());
        return rows;
    }

    MvcTestResult send(AccountId account, String method, String uri, Object body) {
        var request = "PUT".equals(method) ? mvc.put() : mvc.post();
        MvcTestResult result = request.uri(uri).header("Authorization", bearer(account)).contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(body)).exchange();
        assertThat(result.getResponse().getStatus()).as(method + " " + uri).isLessThan(300);
        return result;
    }

    String bearer(AccountId account) {
        return TestSessions.bearer(context, account);
    }
}
