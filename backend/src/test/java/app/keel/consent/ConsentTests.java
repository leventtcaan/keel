package app.keel.consent;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.keel.identity.TestSessions;
import app.keel.persistence.PostgresTestConfiguration;
import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.web.servlet.assertj.MockMvcTester;
import org.springframework.test.web.servlet.assertj.MvcTestResult;
import tools.jackson.databind.json.JsonMapper;

/**
 * Three separate consents (K-204, ADR-007): health data (GDPR Art. 9), Apple Health, and third-party AI with the
 * provider and the data named (Apple 5.1.2(i)). Each is given to a version of its text, can be withdrawn, and the
 * feature behind it stops at once. Every grant and withdrawal is kept, as evidence of what was agreed and when.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(PostgresTestConfiguration.class)
@RecordApplicationEvents
class ConsentTests {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Autowired
    MockMvcTester mvc;

    @Autowired
    ApplicationContext context;

    @Autowired
    ConsentGate gate;

    @Autowired
    JdbcClient jdbc;

    @Autowired
    ApplicationEvents events;

    @Autowired
    ConsentProperties properties;

    @Test
    void aNewAccountHasBeenAskedNothing() throws Exception {
        AccountId account = TestSessions.newAccount();

        List<Map<String, Object>> consents = list(account);

        assertThat(consents).extracting(c -> c.get("kind")).containsExactlyInAnyOrder("HEALTH_DATA", "APPLE_HEALTH", "THIRD_PARTY_AI");
        assertThat(consents).allSatisfy(c -> assertThat(c).containsEntry("status", "NEVER_ASKED"));
        assertThat(gate.granted(account, ConsentKind.HEALTH_DATA)).isFalse();
    }

    @Test
    void consentIsGivenToTheCurrentVersionOfItsText() throws Exception {
        AccountId account = TestSessions.newAccount();

        MvcTestResult result = put(account, "HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA));

        assertThat(result).hasStatusOk();
        assertThat(read(result)).containsEntry("status", "GRANTED").containsEntry("textVersion", ConsentTextVersions.HEALTH_DATA).containsKey("grantedAt");
        assertThat(gate.granted(account, ConsentKind.HEALTH_DATA)).isTrue();
        assertThat(gate.granted(account, ConsentKind.APPLE_HEALTH)).isFalse();
    }

    @Test
    void aTextTheUserWasNotShownCannotBeAgreedTo() {
        assertThat(put(TestSessions.newAccount(), "HEALTH_DATA", Map.of("textVersion", "0-old"))).hasStatus(400)
                .bodyJson().extractingPath("$.code").isEqualTo("VALIDATION_FAILED");
    }

    @Test
    void theTestsGiveConsentsToTheVersionsTheServerTakes() {
        assertThat(properties.versions()).containsEntry(ConsentKind.HEALTH_DATA, ConsentTextVersions.HEALTH_DATA)
                .containsEntry(ConsentKind.APPLE_HEALTH, ConsentTextVersions.APPLE_HEALTH)
                .containsEntry(ConsentKind.THIRD_PARTY_AI, ConsentTextVersions.THIRD_PARTY_AI);
    }

    @Test
    void aYesToTheHealthTextFromBeforeItSaidWithdrawingDeletesIsAskedAgain() throws Exception {
        // K-429 (ADR-037 #36): 2-draft says a withdrawal deletes the data it covers; a yes to 1-draft is not a yes to that.
        AccountId account = TestSessions.newAccount();
        insert(account, "HEALTH_DATA", "1-draft", null, null);

        assertThat(gate.granted(account, ConsentKind.HEALTH_DATA)).isFalse();
        // The list says what was given to which text: the phone reads a grant to a text it no longer shows as not given.
        assertThat(list(account)).filteredOn(c -> "HEALTH_DATA".equals(c.get("kind"))).singleElement()
                .satisfies(c -> assertThat(c).containsEntry("status", "GRANTED").containsEntry("textVersion", "1-draft"));
        assertThat(put(account, "HEALTH_DATA", Map.of("textVersion", "1-draft"))).hasStatus(400);
        assertThat(put(account, "HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA))).hasStatusOk();
        assertThat(gate.granted(account, ConsentKind.HEALTH_DATA)).isTrue();
    }

    @Test
    void thirdPartyAiNamesTheProviderAndTheData() throws Exception {
        AccountId account = TestSessions.newAccount();
        assertThat(put(account, "THIRD_PARTY_AI", Map.of("textVersion", ConsentTextVersions.THIRD_PARTY_AI))).hasStatus(400);
        assertThat(put(account, "THIRD_PARTY_AI", Map.of("textVersion", ConsentTextVersions.THIRD_PARTY_AI, "provider", "Example AI", "dataTypes", List.of())))
                .hasStatus(400);

        MvcTestResult result = put(account, "THIRD_PARTY_AI",
                Map.of("textVersion", ConsentTextVersions.THIRD_PARTY_AI, "provider", "Example AI", "dataTypes", List.of("meal photo", "meal note", "coach question")));

        assertThat(read(result)).containsEntry("status", "GRANTED").containsEntry("provider", "Example AI")
                .containsEntry("dataTypes", List.of("meal photo", "meal note", "coach question"));
    }

    @Test
    void theAiConsentIsToTheProviderAndDataTheServerWouldActuallyUse() {
        // Apple 5.1.2(i), V2: consent is to a named provider and named data. Another name, or other data, is not it.
        AccountId account = TestSessions.newAccount();

        assertThat(put(account, "THIRD_PARTY_AI", Map.of("textVersion", ConsentTextVersions.THIRD_PARTY_AI, "provider", "Other AI",
                "dataTypes", List.of("meal photo", "meal note", "coach question")))).hasStatus(400);
        assertThat(put(account, "THIRD_PARTY_AI", Map.of("textVersion", ConsentTextVersions.THIRD_PARTY_AI, "provider", "Example AI",
                "dataTypes", List.of("meal photo", "meal note", "coach question", "weight")))).hasStatus(400);
        // Less than the server would send is not it either (K-505: the coach's question is one of the data).
        assertThat(put(account, "THIRD_PARTY_AI", Map.of("textVersion", ConsentTextVersions.THIRD_PARTY_AI, "provider", "Example AI",
                "dataTypes", List.of("meal photo", "meal note")))).hasStatus(400);
    }

    @Test
    void aConsentToAnOldTextOrAnotherProviderNoLongerCounts() {
        // When the text is revised or the provider changes, the gate closes until the user agrees to what is now true.
        AccountId oldText = TestSessions.newAccount();
        AccountId oldProvider = TestSessions.newAccount();
        insert(oldText, "HEALTH_DATA", "0-old", null, null);
        insert(oldProvider, "THIRD_PARTY_AI", ConsentTextVersions.THIRD_PARTY_AI, "Former AI", new String[] {"meal photo", "meal note", "coach question"});

        assertThat(gate.granted(oldText, ConsentKind.HEALTH_DATA)).isFalse();
        assertThat(gate.granted(oldProvider, ConsentKind.THIRD_PARTY_AI)).isFalse();
    }

    @Test
    void theLatestIsTheLastWrittenEvenIfTheClockWentBack() {
        // Order by write sequence, not by wall-clock time: a withdrawal written after a grant is the latest, always.
        AccountId account = TestSessions.newAccount();
        jdbc.sql("""
                insert into consent.consent_event (id, account_id, kind, action, text_version, occurred_at)
                values (gen_random_uuid(), :account, 'HEALTH_DATA', 'GRANTED', :version, now()),
                       (gen_random_uuid(), :account, 'HEALTH_DATA', 'WITHDRAWN', :version, now() - interval '1 hour')""")
                .param("account", account.value()).param("version", ConsentTextVersions.HEALTH_DATA).update();

        assertThat(gate.granted(account, ConsentKind.HEALTH_DATA)).isFalse();
    }

    @Test
    void onlyTheAiConsentNamesAProvider() {
        assertThat(put(TestSessions.newAccount(), "HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA, "provider", "Example AI")))
                .hasStatus(400);
    }

    @Test
    void withdrawingStopsTheFeatureAtOnceAndTellsTheModules() throws Exception {
        AccountId account = TestSessions.newAccount();
        put(account, "APPLE_HEALTH", Map.of("textVersion", ConsentTextVersions.APPLE_HEALTH));

        MvcTestResult result = mvc.delete().uri("/v1/consents/APPLE_HEALTH").header("Authorization", bearer(account)).exchange();

        assertThat(read(result)).containsEntry("status", "WITHDRAWN").containsKey("withdrawnAt");
        assertThatThrownBy(() -> gate.require(account, ConsentKind.APPLE_HEALTH)).isInstanceOfSatisfying(ApiException.class,
                refused -> assertThat(refused.code()).isEqualTo(ErrorCode.CONSENT_REQUIRED));
        assertThat(events.stream(ConsentWithdrawn.class)).containsExactly(new ConsentWithdrawn(account, ConsentKind.APPLE_HEALTH));
    }

    @Test
    void withdrawingWhatWasNeverGivenChangesNothing() throws Exception {
        AccountId account = TestSessions.newAccount();

        MvcTestResult result = mvc.delete().uri("/v1/consents/HEALTH_DATA").header("Authorization", bearer(account)).exchange();

        assertThat(read(result)).containsEntry("status", "NEVER_ASKED");
        assertThat(events.stream(ConsentWithdrawn.class)).isEmpty();
    }

    @Test
    void everyGrantAndWithdrawalIsKept() throws Exception {
        AccountId account = TestSessions.newAccount();
        put(account, "HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA));
        mvc.delete().uri("/v1/consents/HEALTH_DATA?confirmDataDeletion=true").header("Authorization", bearer(account)).exchange();
        put(account, "HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA));

        assertThat(jdbc.sql("select action from consent.consent_event where account_id = :account order by occurred_at, id")
                .param("account", account.value()).query(String.class).list()).containsExactly("GRANTED", "WITHDRAWN", "GRANTED");
        assertThat(gate.granted(account, ConsentKind.HEALTH_DATA)).isTrue();
    }

    @Test
    void oneAccountsConsentIsNotAnothers() {
        AccountId one = TestSessions.newAccount();
        put(one, "HEALTH_DATA", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA));

        assertThat(gate.granted(TestSessions.newAccount(), ConsentKind.HEALTH_DATA)).isFalse();
    }

    @Test
    void anUnknownKindIsAValidationError() {
        assertThat(put(TestSessions.newAccount(), "LOCATION", Map.of("textVersion", ConsentTextVersions.HEALTH_DATA))).hasStatus(400);
    }

    @Test
    @SuppressWarnings("unchecked")
    void eachConsentHasATextOfTheVersionTheServerAccepts() throws IOException {
        // ADR-020: the agent drafts, the product owner approves; until then the version says "draft".
        Map<String, Object> copy = JSON.readValue(Files.readString(Path.of("../data/copy/en.json")), Map.class);
        Map<String, Map<String, String>> texts = (Map<String, Map<String, String>>) copy.get("consent");
        for (ConsentKind kind : ConsentKind.values()) {
            Map<String, String> text = texts.get(kind.name().toLowerCase(java.util.Locale.ROOT));
            assertThat(text).as(kind.name()).containsKeys("title", "body").containsEntry("version", properties.versions().get(kind));
        }
    }

    private void insert(AccountId account, String kind, String version, String provider, String[] dataTypes) {
        jdbc.sql("""
                insert into consent.consent_event (id, account_id, kind, action, text_version, provider, data_types, occurred_at)
                values (gen_random_uuid(), :account, :kind, 'GRANTED', :version, :provider, :types, now())""")
                .param("account", account.value()).param("kind", kind).param("version", version).param("provider", provider)
                .param("types", dataTypes).update();
    }

    private List<Map<String, Object>> list(AccountId account) throws Exception {
        MvcTestResult result = mvc.get().uri("/v1/consents").header("Authorization", bearer(account)).exchange();
        assertThat(result).hasStatusOk();
        return JSON.readValue(result.getResponse().getContentAsString(), List.class);
    }

    private MvcTestResult put(AccountId account, String kind, Map<String, ?> body) {
        return mvc.put().uri("/v1/consents/" + kind).header("Authorization", bearer(account))
                .contentType(MediaType.APPLICATION_JSON).content(JSON.writeValueAsString(body)).exchange();
    }

    private String bearer(AccountId account) {
        return TestSessions.bearer(context, account);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> read(MvcTestResult result) throws Exception {
        return JSON.readValue(result.getResponse().getContentAsString(), Map.class);
    }
}
