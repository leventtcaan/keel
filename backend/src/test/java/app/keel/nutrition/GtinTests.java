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
    void aMisreadOrMalformedCodeIsNone() {
        assertThat(Gtin.normalize("016000275288")).as("check digit").isEmpty();
        assertThat(Gtin.normalize("8690504055504")).as("check digit").isEmpty();
        assertThat(Gtin.normalize("1234567")).as("too short").isEmpty();
        assertThat(Gtin.normalize("123456789012345")).as("too long").isEmpty();
        assertThat(Gtin.normalize("01600027528a")).isEmpty();
        assertThat(Gtin.normalize(null)).isEmpty();
    }
}
