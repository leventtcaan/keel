package app.keel.profile;

import static org.assertj.core.api.Assertions.assertThat;

import app.keel.consent.ConsentTextVersions;
import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import java.time.DayOfWeek;
import java.time.Year;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * The profile (K-205, contract /v1/profile): goal, sex, height, birth year, activity, program choice, schedule, food
 * preferences, units — the engine's user-specific inputs. Onboarding sets it whole, settings change it whole; other
 * modules read it through {@link Profiles}.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
class ProfileApiTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    Profiles profiles;

    @Autowired
    JdbcClient jdbc;

    static Map<String, Object> onboarding() {
        Map<String, Object> profile = new HashMap<>(Map.of(
                "goal", "LOSE_FAT", "sex", "MALE", "heightCm", 180, "birthYear", 1996, "programChoice", "BUILD_ONE_FOR_ME",
                "units", "METRIC",
                "schedule", Map.of("trainingDays", List.of("MONDAY", "TUESDAY", "THURSDAY", "FRIDAY"), "usualTrainingTime", "18:30",
                        "sessionsLastMonth", "TWO_TO_THREE", "checkInDay", "MONDAY", "timeZone", "Europe/Istanbul"),
                "food", Map.of("avoid", List.of("mushrooms"), "budgetNote", "student budget")));
        profile.put("activityLevel", "LOW_ACTIVE");
        return profile;
    }

    @Test
    void anAccountWithoutAProfileIsNotFound() {
        assertThat(get(TestSessions.newAccount())).hasStatus(404).bodyJson().extractingPath("$.code").isEqualTo("NOT_FOUND");
    }

    @Test
    void theProfileIsStoredAndReadBackAsSent() throws Exception {
        AccountId account = consenting();

        assertThat(put(account, onboarding())).hasStatusOk();

        assertThat(read(get(account))).isEqualTo(onboarding());
    }

    @Test
    void settingsReplaceTheWholeProfile() throws Exception {
        AccountId account = consenting();
        put(account, onboarding());
        Map<String, Object> changed = onboarding();
        changed.put("goal", "DECIDE_FOR_ME");
        changed.remove("activityLevel");
        changed.remove("food");

        put(account, changed);

        assertThat(read(get(account))).isEqualTo(changed);
    }

    @Test
    void theAnswerToAPutIsWhatAGetWillReturn() throws Exception {
        AccountId account = consenting();
        Map<String, Object> profile = onboarding();
        profile.put("food", Map.of());

        Map<String, Object> answered = read(put(account, profile));

        assertThat(answered).isEqualTo(read(get(account))).doesNotContainKey("food");
    }

    @Test
    void otherModulesReadWhatTheEngineNeeds() {
        AccountId account = consenting();
        put(account, onboarding());

        Optional<ProfileFacts> facts = profiles.of(account);

        assertThat(facts).contains(new ProfileFacts(Sex.MALE, 180, 1996, Optional.of(Activity.LOW_ACTIVE), Goal.LOSE_FAT,
                DayOfWeek.MONDAY, ZoneId.of("Europe/Istanbul"), java.util.Set.of(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY)));
        assertThat(profiles.of(TestSessions.newAccount())).isEmpty();
    }

    @Test
    void impossibleValuesAreValidationErrors() {
        AccountId account = consenting();
        List<Map.Entry<String, Object>> bads = List.of(Map.entry("heightCm", 99), Map.entry("heightCm", 251),
                Map.entry("birthYear", 1899), Map.entry("birthYear", Year.now().getValue() + 1), Map.entry("goal", "GET_RICH"),
                Map.entry("sex", "OTHER"), Map.entry("units", "PARSECS"));
        for (Map.Entry<String, Object> bad : bads) {
            Map<String, Object> profile = onboarding();
            profile.put(bad.getKey(), bad.getValue());
            assertThat(put(account, profile)).as(bad.toString()).hasStatus(400).bodyJson().extractingPath("$.code").isEqualTo("VALIDATION_FAILED");
        }
    }

    @Test
    void numbersAreNotReadAsEnumsNorAsDifferentNumbers() {
        // K-205 review: by default the JSON reader turns "sex": 1 into FEMALE, "heightCm": 180.7 into 180 and "180" into
        // 180 — a client's index bug would silently store the wrong sex or check-in day. The contract says strings and
        // integers; anything else is a validation error.
        AccountId account = consenting();
        List<Map.Entry<String, Object>> loose = List.of(Map.entry("sex", 1), Map.entry("goal", 0), Map.entry("heightCm", 180.7),
                Map.entry("heightCm", "180"));
        for (Map.Entry<String, Object> value : loose) {
            Map<String, Object> profile = onboarding();
            profile.put(value.getKey(), value.getValue());
            assertThat(put(account, profile)).as(value.toString()).hasStatus(400);
        }
        Map<String, Object> dayAsNumber = onboarding();
        dayAsNumber.put("schedule", Map.of("trainingDays", List.of(0), "checkInDay", "MONDAY", "timeZone", "UTC"));
        assertThat(put(account, dayAsNumber)).hasStatus(400);
    }

    @Test
    void theScheduleMustBeUsable() {
        AccountId account = consenting();
        for (Map<String, Object> schedule : List.of(
                Map.<String, Object>of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "Mars/Olympus"),
                Map.<String, Object>of("trainingDays", List.of("MONDAY", "MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC"),
                Map.<String, Object>of("trainingDays", List.of("MONDAY"), "checkInDay", "MONDAY", "timeZone", "UTC", "usualTrainingTime", "25:00"),
                Map.<String, Object>of("trainingDays", List.of("MONDAY"), "timeZone", "UTC"))) {
            Map<String, Object> profile = onboarding();
            profile.put("schedule", schedule);
            assertThat(put(account, profile)).as(schedule.toString()).hasStatus(400);
        }
    }

    @Test
    void aMissingRequiredFieldIsAValidationError() {
        Map<String, Object> profile = onboarding();
        profile.remove("sex");

        assertThat(put(TestSessions.newAccount(), profile)).hasStatus(400);
    }

    private MvcTestResult get(AccountId account) {
        return mvc.get().uri("/v1/profile").header("Authorization", TestSessions.bearer(context, account)).exchange();
    }

    @Test
    void onlyACertainAdultHoldsAProfile() {
        // K-225, ADR-027 #13: only the birth year is kept, so the year must make the user 18 on every day of this one.
        Map<String, Object> almost = onboarding();
        // The server reads "this year" on the profile's own calendar (Europe/Istanbul): so does the test, at New Year too.
        int thisYear = java.time.Year.now(java.time.ZoneId.of("Europe/Istanbul")).getValue();
        almost.put("birthYear", thisYear - 18);
        Map<String, Object> adult = onboarding();
        adult.put("birthYear", thisYear - 19);

        assertThat(put(consenting(), almost)).hasStatus(400).bodyJson().extractingPath("$.code").isEqualTo("VALIDATION_FAILED");
        assertThat(put(consenting(), adult)).hasStatusOk();
    }

    @Test
    void theFoodsOneCannotEatAreKeptAndReadOnlyWithTheHealthDataConsent() throws Exception {
        // ADR-027 #14: an allergy or coeliac disease is health data (GDPR Art. 9).
        AccountId noConsent = TestSessions.newAccount();
        assertThat(put(noConsent, onboarding())).hasStatus(403).bodyJson().extractingPath("$.code").isEqualTo("CONSENT_REQUIRED");
        Map<String, Object> nothingToAvoid = onboarding();
        nothingToAvoid.put("food", Map.of("budgetNote", "student budget"));
        assertThat(put(noConsent, nothingToAvoid)).as("no foods to avoid, no health data").hasStatusOk();
        Map<String, Object> emptyList = onboarding();
        emptyList.put("food", Map.of("avoid", List.of(), "budgetNote", "student budget"));
        assertThat(put(noConsent, emptyList)).as("an empty list is nothing to avoid").hasStatusOk();

        AccountId account = consenting();
        put(account, onboarding());
        assertThat((Map<String, Object>) read(get(account)).get("food")).containsEntry("avoid", List.of("mushrooms"));
        mvc.delete().uri("/v1/consents/HEALTH_DATA?confirmDataDeletion=true").header("Authorization", TestSessions.bearer(context, account))
                .exchange();

        assertThat((Map<String, Object>) read(get(account)).get("food")).doesNotContainKey("avoid").containsEntry("budgetNote", "student budget");
    }

    @Test
    void withoutTheConsentAPutLeavesTheStoredFoodsToAvoidAlone() throws Exception {
        // ADR-030 #27: settings PUT the whole profile; a user whose consent is not in force cannot see the list, so a PUT
        // without it is not a wish to empty it. Here the consent was given to a text since revised: closed, not withdrawn.
        AccountId account = consenting();
        put(account, onboarding());
        jdbc.sql("""
                insert into consent.consent_event (id, account_id, kind, action, text_version, occurred_at)
                values (gen_random_uuid(), :account, 'HEALTH_DATA', 'GRANTED', '0-revised', now() + interval '1 second')""")
                .param("account", account.value()).update();
        Map<String, Object> noList = onboarding();
        noList.put("food", Map.of("budgetNote", "student budget"));
        Map<String, Object> emptyList = onboarding();
        emptyList.put("food", Map.of("avoid", List.of(), "budgetNote", "student budget"));
        Map<String, Object> noFood = onboarding();
        noFood.remove("food");

        assertThat(put(account, noList)).hasStatusOk();
        assertThat(put(account, emptyList)).hasStatusOk();
        assertThat(put(account, noFood)).hasStatusOk();

        assertThat(mvc.put().uri("/v1/consents/HEALTH_DATA").header("Authorization", TestSessions.bearer(context, account))
                .contentType(MediaType.APPLICATION_JSON).content("{\"textVersion\":\"" + ConsentTextVersions.HEALTH_DATA + "\"}").exchange()).hasStatusOk();
        assertThat((Map<String, Object>) read(get(account)).get("food")).containsEntry("avoid", List.of("mushrooms"));
    }

    @Test
    void withTheConsentAPutReplacesTheListAndAWithdrawalDeletesIt() throws Exception {
        AccountId account = consenting();
        put(account, onboarding());
        Map<String, Object> emptyList = onboarding();
        emptyList.put("food", Map.of("avoid", List.of(), "budgetNote", "student budget"));
        assertThat(put(account, emptyList)).hasStatusOk();
        assertThat((Map<String, Object>) read(get(account)).get("food")).containsEntry("avoid", List.of());

        put(account, onboarding());
        assertThat(mvc.delete().uri("/v1/consents/HEALTH_DATA?confirmDataDeletion=true").header("Authorization", TestSessions.bearer(context, account))
                .exchange()).hasStatusOk();
        consentAgain(account);

        assertThat((Map<String, Object>) read(get(account)).get("food")).doesNotContainKey("avoid");
    }

    private void consentAgain(AccountId account) {
        assertThat(mvc.put().uri("/v1/consents/HEALTH_DATA").header("Authorization", TestSessions.bearer(context, account))
                .contentType(MediaType.APPLICATION_JSON).content("{\"textVersion\":\"" + ConsentTextVersions.HEALTH_DATA + "\"}").exchange()).hasStatusOk();
    }

    private AccountId consenting() {
        AccountId account = TestSessions.newAccount();
        assertThat(mvc.put().uri("/v1/consents/HEALTH_DATA").header("Authorization", TestSessions.bearer(context, account))
                .contentType(MediaType.APPLICATION_JSON).content("{\"textVersion\":\"" + ConsentTextVersions.HEALTH_DATA + "\"}").exchange()).hasStatusOk();
        return account;
    }

    private MvcTestResult put(AccountId account, Map<String, Object> profile) {
        return mvc.put().uri("/v1/profile").header("Authorization", TestSessions.bearer(context, account))
                .contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(profile)).exchange();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> read(MvcTestResult result) throws Exception {
        assertThat(result).hasStatusOk();
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }
}
