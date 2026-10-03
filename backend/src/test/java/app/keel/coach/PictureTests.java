package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

/**
 * A picture in a turn to the model (K-514): its bytes are its own — what the caller changes afterwards is not what is
 * sent — two pictures of the same bytes are the same, and printing one never prints the photo (V3: a log line of a
 * request holds no health data).
 */
class PictureTests {

    @Test
    void itsBytesAreItsOwn() {
        byte[] bytes = {1, 2, 3};
        Picture picture = new Picture("image/jpeg", bytes);
        bytes[0] = 9;
        assertThat(picture.bytes()).containsExactly(1, 2, 3);
        picture.bytes()[1] = 9;
        assertThat(picture.bytes()).containsExactly(1, 2, 3);
    }

    @Test
    void theSameBytesAreTheSamePicture() {
        assertThat(new Picture("image/jpeg", new byte[] {1, 2})).isEqualTo(new Picture("image/jpeg", new byte[] {1, 2}))
                .hasSameHashCodeAs(new Picture("image/jpeg", new byte[] {1, 2}));
        assertThat(new Picture("image/jpeg", new byte[] {1, 2})).isNotEqualTo(new Picture("image/jpeg", new byte[] {1, 3}));
    }

    @Test
    void printedItSaysOnlyHowLarge() {
        assertThat(new Picture("image/jpeg", new byte[] {101, 102, 103})).hasToString("Picture[image/jpeg, 3 bytes]");
    }

    @Test
    void aTurnMayCarryOne() {
        Picture picture = new Picture("image/jpeg", new byte[] {1});
        assertThat(Turn.user("words").picture()).isNull();
        assertThat(Turn.userWithPicture("", picture).picture()).isEqualTo(picture);
        assertThatThrownBy(() -> new Picture("image/jpeg", new byte[0])).isInstanceOf(IllegalArgumentException.class);
    }
}
