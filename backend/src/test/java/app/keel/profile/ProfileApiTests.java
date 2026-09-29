package app.keel.profile;

import static org.assertj.core.api.Assertions.assertThat;

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
        AccountId account = TestSessions.newAccount();

        assertThat(put(account, onboarding())).hasStatusOk();

        assertThat(read(get(account))).isEqualTo(onboarding());
    }

    @Test
    void settingsReplaceTheWholeProfile() throws Exception {
        AccountId account = TestSessions.newAccount();
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
        AccountId account = TestSessions.newAccount();
        Map<String, Object> profile = onboarding();
        profile.put("food", Map.of());

        Map<String, Object> answered = read(put(account, profile));

        assertThat(answered).isEqualTo(read(get(account))).doesNotContainKey("food");
    }

    @Test
    void otherModulesReadWhatTheEngineNeeds() {
        AccountId account = TestSessions.newAccount();
        put(account, onboarding());

        Optional<ProfileFacts> facts = profiles.of(account);

        assertThat(facts).contains(new ProfileFacts(Sex.MALE, 180, 1996, Optional.of(Activity.LOW_ACTIVE), Goal.LOSE_FAT,
                DayOfWeek.MONDAY, ZoneId.of("Europe/Istanbul")));
        assertThat(profiles.of(TestSessions.newAccount())).isEmpty();
    }

    @Test
    void impossibleValuesAreValidationErrors() {
        AccountId account = TestSessions.newAccount();
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
        AccountId account = TestSessions.newAccount();
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
        AccountId account = TestSessions.newAccount();
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
