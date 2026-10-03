package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalStateException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.keel.shared.AccountId;
import app.keel.shared.ApiException;
import app.keel.shared.ErrorCode;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

/**
 * How much of a photo request is read (K-514): the longest a photo of max-bytes can be in base64 with a little JSON around
 * it — never more, whether or not the request says how long it is (a streamed body has no length; K-514 review).
 */
class PhotoBodyTests {

    @Test
    void theLimitIsThePhotoInBase64AndTheJsonAroundIt() {
        // 4 characters for every 3 bytes, rounded up to a whole group; 256 for the JSON.
        assertThat(new PhotoProperties(1024, 1, 0.85f).maxBody()).isEqualTo(260);
        assertThat(new PhotoProperties(1024, 3, 0.85f).maxBody()).isEqualTo(260);
        assertThat(new PhotoProperties(1024, 4, 0.85f).maxBody()).isEqualTo(264);
        String largest = "{\"image\": \"" + Base64.getEncoder().encodeToString(new byte[2_500_000]) + "\"}";
        assertThat(new PhotoProperties(1024, 2_500_000, 0.85f).maxBody()).as("the largest photo fits").isGreaterThanOrEqualTo(largest.length());
    }

    @Test
    void realLimitsOrTheServerDoesNotStart() {
        assertThatIllegalStateException().isThrownBy(() -> new PhotoProperties(null, 1, 0.85f));
        assertThatIllegalStateException().isThrownBy(() -> new PhotoProperties(1024, 0, 0.85f));
        assertThatIllegalStateException().isThrownBy(() -> new PhotoProperties(1024, 1, 0f));
        assertThatIllegalStateException().isThrownBy(() -> new PhotoProperties(1024, 1, 1.01f));
    }

    @Test
    void aStreamedBodyIsReadNoFurtherThanTheLimit() {
        CoachController controller = new CoachController(null, null, null, null, new PhotoProperties(1024, 3, 0.85f));

        assertThatThrownBy(() -> controller.photo(ACCOUNT, streamed("x".repeat(261)))).isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).code()).isEqualTo(ErrorCode.PAYLOAD_TOO_LARGE));
        // At the limit it is read — and refused for what it is, not for its length.
        assertThatThrownBy(() -> controller.photo(ACCOUNT, streamed("x".repeat(260)))).isInstanceOf(ApiException.class)
                .satisfies(e -> assertThat(((ApiException) e).code()).isEqualTo(ErrorCode.VALIDATION_FAILED));
    }

    private static final AccountId ACCOUNT = new AccountId(UUID.randomUUID());

    /** A body with no length, as a streamed (chunked) request has. */
    private static MockHttpServletRequest streamed(String body) {
        MockHttpServletRequest request = new MockHttpServletRequest() {
            @Override
            public long getContentLengthLong() {
                return -1;
            }
        };
        request.setContent(body.getBytes(StandardCharsets.US_ASCII));
        return request;
    }
}
