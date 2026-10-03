package app.keel.coach;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * A meal photo (K-514, keel.coach.photo; V1): the longest side the server takes, the most bytes, and the quality of the
 * JPEG it writes from the pixels. The request may be no longer than the bytes in base64 and a little JSON around them.
 */
@ConfigurationProperties("keel.coach.photo")
record PhotoProperties(Integer maxSide, Integer maxBytes, Float jpegQuality) {

    /** Room for the JSON around the base64: the braces, the key and a little white space. */
    private static final int ENVELOPE = 256;

    PhotoProperties {
        if (maxSide == null || maxBytes == null || jpegQuality == null || maxSide < 1 || maxBytes < 1 || jpegQuality <= 0 || jpegQuality > 1) {
            throw new IllegalStateException("keel.coach.photo: max-side and max-bytes are at least 1, jpeg-quality is in (0, 1]");
        }
    }

    /** The longest request body: the bytes in base64 (4 characters for every 3 bytes) and the JSON around them. */
    int maxBody() {
        return Math.addExact(Math.multiplyExact(4, (maxBytes + 2) / 3), ENVELOPE);
    }

    MealPhoto photo() {
        return new MealPhoto(maxSide, maxBytes, jpegQuality);
    }
}
