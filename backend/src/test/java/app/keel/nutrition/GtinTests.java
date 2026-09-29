package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** Barcodes as FDC stores them (K-208): GTIN-14, the GS1 check digit verified. */
class GtinTests {

    @Test
    void everyScannedLengthBecomesTheSameGtin14() {
        assertThat(Gtin.normalize("016000275287")).contains("00016000275287");   // UPC-A
        assertThat(Gtin.normalize("0016000275287")).contains("00016000275287");  // EAN-13
        assertThat(Gtin.normalize("00016000275287")).contains("00016000275287"); // GTIN-14
        assertThat(Gtin.normalize("8690504055501")).contains("08690504055501");  // a Turkish EAN-13
        assertThat(Gtin.normalize("96385074")).contains("00000096385074");       // GTIN-8
    }

    @Test
    void anEightDigitCodeIsReadAsEan8AndAsUpcE() {
        // Eight digits are EAN-8 or UPC-E; a UPC-E's check digit is its expanded UPC-A's (K-208 review).
        assertThat(Gtin.candidates("04963406")).containsExactly("00049000006346");   // UPC-E only: as EAN-8 the check fails
        assertThat(Gtin.candidates("96385074")).containsExactly("00000096385074");   // EAN-8 only
        assertThat(Gtin.candidates("01234565")).contains("00012345000065");          // UPC-E ending 5: 0 12345 0000 5
        assertThat(Gtin.candidates("01234514")).contains("00012100003454");          // UPC-E ending 1: 0 12 1 0000 345
        assertThat(Gtin.candidates("016000275287")).containsExactly("00016000275287");
        assertThat(Gtin.candidates("016000275288")).isEmpty();
    }

    @Test
    void aMisreadOrMalformedCodeIsNone() {
        assertThat(Gtin.normalize("016000275288")).as("check digit").isEmpty();
        assertThat(Gtin.normalize("8690504055504")).as("check digit").isEmpty();
        assertThat(Gtin.normalize("1234565")).as("seven digits, though the check digit would hold").isEmpty();
        assertThat(Gtin.normalize("123456789012345")).as("too long").isEmpty();
        assertThat(Gtin.normalize("01600027528a")).isEmpty();
        assertThat(Gtin.normalize(null)).isEmpty();
    }
}
