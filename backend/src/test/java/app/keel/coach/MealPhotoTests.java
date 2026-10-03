package app.keel.coach;

import static org.assertj.core.api.Assertions.assertThat;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;

/**
 * A meal photo before it goes to a model (K-514, V1): at most 1024 px a side — the app shrinks it (K-408), the server
 * refuses a larger one rather than shrink what should never have left the phone — and nothing but the pixels: whatever
 * the file carried (EXIF with the place and the phone, a comment) is gone, because the server sends a JPEG it wrote itself.
 */
class MealPhotoTests {

    private static final MealPhoto PHOTO = new MealPhoto(1024, 2_000_000, 0.85f);

    @Test
    void whatTheFileCarriedBesidesThePixelsIsGone() throws IOException {
        byte[] withExif = withSegment(jpeg(640, 480), exif("GPSLatitude 36.8969 Antalya iPhone"));

        Picture sent = PHOTO.clean(withExif).orElseThrow();

        assertThat(sent.mediaType()).isEqualTo("image/jpeg");
        assertThat(contains(sent.bytes(), "Exif")).as("no EXIF segment").isFalse();
        assertThat(contains(sent.bytes(), "GPSLatitude")).isFalse();
        assertThat(contains(sent.bytes(), "Antalya")).isFalse();
        assertThat(hasSegment(sent.bytes(), 0xE1)).as("no APP1 (EXIF, XMP)").isFalse();
        BufferedImage read = ImageIO.read(new ByteArrayInputStream(sent.bytes()));
        assertThat(read.getWidth()).isEqualTo(640);
        assertThat(read.getHeight()).isEqualTo(480);
    }

    @Test
    void aCommentInTheFileIsGoneToo() throws IOException {
        byte[] withComment = withSegment(jpeg(100, 100), segment(0xFE, "taken at home, kitchen table".getBytes(StandardCharsets.US_ASCII)));

        Picture sent = PHOTO.clean(withComment).orElseThrow();

        assertThat(contains(sent.bytes(), "kitchen")).isFalse();
        assertThat(hasSegment(sent.bytes(), 0xFE)).isFalse();
    }

    @Test
    void atMost1024PxASide() throws IOException {
        assertThat(PHOTO.clean(jpeg(1024, 768))).isPresent();
        assertThat(PHOTO.clean(jpeg(768, 1024))).isPresent();
        assertThat(PHOTO.clean(jpeg(1025, 768))).as("the app shrinks; the server does not").isEmpty();
        assertThat(PHOTO.clean(jpeg(768, 1025))).isEmpty();
        // Read from the header, before the pixels: a tiny file that says it is huge is not decoded.
        assertThat(PHOTO.clean(png(4000, 1))).isEmpty();
    }

    @Test
    void aPngIsSentAsAJpegWithoutItsTransparency() throws IOException {
        BufferedImage seeThrough = new BufferedImage(50, 40, BufferedImage.TYPE_INT_ARGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(seeThrough, "png", out);

        Picture sent = PHOTO.clean(out.toByteArray()).orElseThrow();

        assertThat(sent.mediaType()).isEqualTo("image/jpeg");
        assertThat(sent.bytes()[0] & 0xFF).isEqualTo(0xFF);
        assertThat(sent.bytes()[1] & 0xFF).isEqualTo(0xD8);
        assertThat(ImageIO.read(new ByteArrayInputStream(sent.bytes())).getWidth()).isEqualTo(50);
    }

    @Test
    void onlyAPhotoAndNotTooLarge() throws IOException {
        assertThat(PHOTO.clean(new byte[0])).isEmpty();
        assertThat(PHOTO.clean("not a picture".getBytes(StandardCharsets.US_ASCII))).isEmpty();
        assertThat(PHOTO.clean(Arrays.copyOf(jpeg(200, 200), 40))).as("cut short").isEmpty();
        ByteArrayOutputStream gif = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(10, 10, BufferedImage.TYPE_INT_RGB), "gif", gif);
        assertThat(PHOTO.clean(gif.toByteArray())).as("JPEG or PNG only").isEmpty();
        byte[] photo = jpeg(300, 300);
        assertThat(new MealPhoto(1024, photo.length - 1, 0.85f).clean(photo)).as("more bytes than allowed").isEmpty();
        assertThat(new MealPhoto(1024, photo.length, 0.85f).clean(photo)).isPresent();
    }

    // ── helpers ──

    static byte[] jpeg(int width, int height) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        for (int x = 0; x < width; x += 7) {
            image.setRGB(x, x % height, 0xC08040);
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "jpg", out);
        return out.toByteArray();
    }

    private static byte[] png(int width, int height) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(width, height, BufferedImage.TYPE_BYTE_GRAY), "png", out);
        return out.toByteArray();
    }

    /** An APP1 EXIF segment: "Exif\0\0", a little-endian TIFF header with an empty IFD, and the words after it. */
    static byte[] exif(String words) {
        byte[] tiff = {'I', 'I', 42, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0};
        byte[] text = words.getBytes(StandardCharsets.US_ASCII);
        byte[] body = new byte[6 + tiff.length + text.length];
        System.arraycopy("Exif\0\0".getBytes(StandardCharsets.US_ASCII), 0, body, 0, 6);
        System.arraycopy(tiff, 0, body, 6, tiff.length);
        System.arraycopy(text, 0, body, 6 + tiff.length, text.length);
        return segment(0xE1, body);
    }

    private static byte[] segment(int marker, byte[] body) {
        int length = body.length + 2;
        byte[] segment = new byte[body.length + 4];
        segment[0] = (byte) 0xFF;
        segment[1] = (byte) marker;
        segment[2] = (byte) (length >> 8);
        segment[3] = (byte) length;
        System.arraycopy(body, 0, segment, 4, body.length);
        return segment;
    }

    /** The segment right after the start of the image, as a camera writes EXIF. */
    static byte[] withSegment(byte[] jpeg, byte[] segment) {
        byte[] out = new byte[jpeg.length + segment.length];
        System.arraycopy(jpeg, 0, out, 0, 2);
        System.arraycopy(segment, 0, out, 2, segment.length);
        System.arraycopy(jpeg, 2, out, 2 + segment.length, jpeg.length - 2);
        return out;
    }

    static boolean contains(byte[] bytes, String words) {
        byte[] needle = words.getBytes(StandardCharsets.US_ASCII);
        outer:
        for (int i = 0; i + needle.length <= bytes.length; i++) {
            for (int j = 0; j < needle.length; j++) {
                if (bytes[i + j] != needle[j]) {
                    continue outer;
                }
            }
            return true;
        }
        return false;
    }

    /** Whether a marker segment comes before the image data (start of scan). */
    static boolean hasSegment(byte[] jpeg, int marker) {
        int i = 2;
        while (i + 4 <= jpeg.length && (jpeg[i] & 0xFF) == 0xFF) {
            int at = jpeg[i + 1] & 0xFF;
            if (at == 0xDA) {
                return false;
            }
            if (at == marker) {
                return true;
            }
            i += 2 + (((jpeg[i + 2] & 0xFF) << 8) | (jpeg[i + 3] & 0xFF));
        }
        return false;
    }
}
