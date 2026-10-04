package app.keel.subscription;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * RevenueCat's webhook signature (ADR-056 #1; docs, read 4 Oct): {@code X-RevenueCat-Webhook-Signature: t=<unix seconds>,v1=<hex>},
 * HMAC-SHA256 of {@code "<t>." + the raw body}, keyed by the signing secret's UTF-8 bytes. A request is RevenueCat's only if it
 * was signed with our secret over this very body (nothing changed on the way) and at a moment within the tolerance of ours (a
 * request caught and sent again later is refused). The comparison takes the same time whatever the bytes (MessageDigest.isEqual).
 */
final class WebhookSignature {

    static final String HEADER = "X-RevenueCat-Webhook-Signature";

    private static final String ALGORITHM = "HmacSHA256";
    private static final int SIGNATURE_BYTES = 32;

    private WebhookSignature() {
    }

    static boolean verify(String header, byte[] body, byte[] secret, Instant now, Duration tolerance) {
        if (header == null) {
            return false;
        }
        Long t = null;
        List<byte[]> signatures = new ArrayList<>();
        for (String part : header.split(",")) {
            String[] pair = part.strip().split("=", 2);
            if (pair.length != 2) {
                return false;
            }
            switch (pair[0]) {
                case "t" -> {
                    if (t != null || !pair[1].matches("[0-9]{1,12}")) {
                        return false;
                    }
                    t = Long.parseLong(pair[1]);
                }
                case "v1" -> {
                    if (pair[1].length() != SIGNATURE_BYTES * 2 || !pair[1].matches("[0-9a-fA-F]+")) {
                        return false;
                    }
                    signatures.add(HexFormat.of().parseHex(pair[1]));
                }
                default -> {
                    // Another scheme's field: not ours to read.
                }
            }
        }
        if (t == null || signatures.isEmpty() || Math.abs(now.getEpochSecond() - t) > tolerance.toSeconds()) {
            return false;
        }
        byte[] expected = mac(secret, t, body);
        boolean any = false;
        for (byte[] signature : signatures) {
            any |= MessageDigest.isEqual(expected, signature);
        }
        return any;
    }

    private static byte[] mac(byte[] secret, long t, byte[] body) {
        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(new SecretKeySpec(secret, ALGORITHM));
            mac.update((t + ".").getBytes(StandardCharsets.UTF_8));
            return mac.doFinal(body);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }
}
