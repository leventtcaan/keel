package app.keel.coach;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Iterator;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.MemoryCacheImageInputStream;
import javax.imageio.stream.MemoryCacheImageOutputStream;

/**
 * A meal photo before it goes to a model (K-514, V1): a JPEG or a PNG of at most {@code maxSide} pixels a side and
 * {@code maxBytes} bytes — the app shrinks it (K-408); a larger one is refused, not shrunk, since it should never have left
 * the phone. The size is read from the header, before a pixel is decoded (a small file can say it is huge). What goes on
 * is a JPEG the server writes itself from the pixels alone: nothing the file carried besides them — EXIF with the place
 * and the phone, XMP, a comment — can reach the model. Nothing is kept: the bytes live in memory as long as the request,
 * read and written without a cache file.
 */
final class MealPhoto {

    private static final Set<String> FORMATS = Set.of("jpeg", "png");

    private final int maxSide;
    private final int maxBytes;
    private final float quality;

    MealPhoto(int maxSide, int maxBytes, float quality) {
        if (maxSide < 1 || maxBytes < 1 || quality <= 0 || quality > 1) {
            throw new IllegalArgumentException("a photo has a side and bytes of at least 1 and a quality in (0, 1]");
        }
        this.maxSide = maxSide;
        this.maxBytes = maxBytes;
        this.quality = quality;
    }

    /** The photo as it goes on — empty for anything that is not a JPEG or a PNG within the limits. */
    Optional<Picture> clean(byte[] raw) {
        if (raw == null || raw.length == 0 || raw.length > maxBytes) {
            return Optional.empty();
        }
        try {
            return pixels(raw).map(this::jpeg);
        } catch (IOException | RuntimeException notAPhoto) {
            // A broken file is a refused photo; what it held is not told (V3: nothing of it in a log).
            return Optional.empty();
        }
    }

    private Optional<BufferedImage> pixels(byte[] raw) throws IOException {
        // In memory, never ImageIO's default file cache: the photo, EXIF and all, would sit in a temporary file — left
        // behind if the server died mid-request (K-514 review, V1, V3).
        try (ImageInputStream in = new MemoryCacheImageInputStream(new ByteArrayInputStream(raw))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(in);
            if (!readers.hasNext()) {
                return Optional.empty();
            }
            ImageReader reader = readers.next();
            try {
                if (!FORMATS.contains(reader.getFormatName().toLowerCase(Locale.ROOT))) {
                    return Optional.empty();
                }
                reader.setInput(in, true, true);
                if (reader.getWidth(0) > maxSide || reader.getHeight(0) > maxSide) {
                    return Optional.empty();
                }
                return Optional.of(reader.read(0));
            } finally {
                reader.dispose();
            }
        }
    }

    /** The pixels alone, as a JPEG: no transparency (a JPEG has none — drawn on white), no metadata. */
    private Picture jpeg(BufferedImage image) {
        BufferedImage rgb = new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = rgb.createGraphics();
        try {
            graphics.drawImage(image, 0, 0, Color.WHITE, null);
        } finally {
            graphics.dispose();
        }
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (MemoryCacheImageOutputStream stream = new MemoryCacheImageOutputStream(out)) {
            writer.setOutput(stream);
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(quality);
            writer.write(null, new IIOImage(rgb, null, null), param);
        } catch (IOException inMemory) {
            throw new UncheckedIOException(inMemory);
        } finally {
            writer.dispose();
        }
        return new Picture("image/jpeg", out.toByteArray());
    }
}
