package app.keel.nutrition;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Barcodes (K-208): a scanned UPC-A (12), EAN-13 or GTIN-8/14 as the GTIN-14 FDC stores, left-padded with zeros. A code
 * whose GS1 check digit is wrong was misread; it is refused rather than looked up.
 */
final class Gtin {

    private static final int LENGTH = 14;

    private Gtin() {
    }

    /**
     * Every GTIN-14 the scanned code can be, valid by its check digit. Eight digits are an EAN-8 or a UPC-E (small US
     * packages); a UPC-E's check digit belongs to its expansion to UPC-A (GS1), so it is expanded, not padded.
     */
    static List<String> candidates(String scanned) {
        List<String> gtins = new ArrayList<>();
        normalize(scanned).ifPresent(gtins::add);
        if (scanned != null && scanned.matches("[01][0-9]{7}")) {
            normalize(upcA(scanned)).filter(gtin -> !gtins.contains(gtin)).ifPresent(gtins::add);
        }
        return List.copyOf(gtins);
    }

    /** UPC-E (number system, six digits, check) to UPC-A, by the sixth digit (GS1 General Specifications). */
    private static String upcA(String upcE) {
        char system = upcE.charAt(0);
        String d = upcE.substring(1, 7);
        char check = upcE.charAt(7);
        String body = switch (d.charAt(5)) {
            case '0', '1', '2' -> d.substring(0, 2) + d.charAt(5) + "0000" + d.substring(2, 5);
            case '3' -> d.substring(0, 3) + "00000" + d.substring(3, 5);
            case '4' -> d.substring(0, 4) + "00000" + d.charAt(4);
            default -> d.substring(0, 5) + "0000" + d.charAt(5);
        };
        return system + body + check;
    }

    /** The code read as it is (GTIN-8, UPC-A, EAN-13, GTIN-14), left-padded, if its check digit holds. */
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
