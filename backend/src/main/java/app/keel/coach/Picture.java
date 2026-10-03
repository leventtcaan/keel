package app.keel.coach;

import java.util.Arrays;
import java.util.Objects;

/**
 * A picture in a turn to the model (K-514): a meal photo the server cleaned (MealPhoto). Its bytes are its own — copied in
 * and out — and printing it says only how large it is: a request in a log line carries no photo (V3).
 */
record Picture(String mediaType, byte[] bytes) {

    Picture {
        Objects.requireNonNull(mediaType, "mediaType");
        if (bytes == null || bytes.length == 0) {
            throw new IllegalArgumentException("a picture has bytes");
        }
        bytes = bytes.clone();
    }

    @Override
    public byte[] bytes() {
        return bytes.clone();
    }

    @Override
    public boolean equals(Object other) {
        return other instanceof Picture that && mediaType.equals(that.mediaType) && Arrays.equals(bytes, that.bytes);
    }

    @Override
    public int hashCode() {
        return 31 * mediaType.hashCode() + Arrays.hashCode(bytes);
    }

    @Override
    public String toString() {
        return "Picture[" + mediaType + ", " + bytes.length + " bytes]";
    }
}
