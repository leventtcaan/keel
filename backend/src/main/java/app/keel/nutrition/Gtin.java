package app.keel.nutrition;

import java.util.Optional;

/**
 * Barcodes (K-208): a scanned UPC-A (12), EAN-13 or GTIN-8/14 as the GTIN-14 FDC stores, left-padded with zeros. A code
 * whose GS1 check digit is wrong was misread; it is refused rather than looked up.
 */
final class Gtin {

    private static final int LENGTH = 14;

    private Gtin() {
    }

    static Optional<String> normalize(String scanned) {
        if (scanned == null || !scanned.matches("[0-9]{8,14}")) {
            return Optional.empty();
        }
        String gtin = "0".repeat(LENGTH - scanned.length()) + scanned;
        int sum = 0;
        for (int i = 0; i < LENGTH - 1; i++) {
            // GS1: from the left of a GTIN-14, weights alternate 3, 1, 3, …
            sum += (gtin.charAt(i) - '0') * (i % 2 == 0 ? 3 : 1);
        }
        int check = (10 - sum % 10) % 10;
        return check == gtin.charAt(LENGTH - 1) - '0' ? Optional.of(gtin) : Optional.empty();
    }
}
