package app.keel.nutrition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/** The streaming CSV reader (K-1061): RFC 4180 as FoodData Central writes it, one record at a time. */
class CsvTests {

    @TempDir
    Path dir;

    private List<List<String>> read(String text, String... columns) throws Exception {
        Path file = dir.resolve("f.csv");
        Files.writeString(file, text, StandardCharsets.UTF_8);
        List<List<String>> rows = new ArrayList<>();
        Csv.forEach(file, row -> {
            List<String> values = new ArrayList<>();
            for (String column : columns) {
                values.add(row.get(column));
            }
            rows.add(values);
        });
        return rows;
    }

    @Test
    void quotedFieldsKeepTheirCommasQuotesAndLineBreaks() throws Exception {
        String text = "\"id\",\"name\"\n\"1\",\"Chicken, \"\"breast\"\"\"\n\"2\",\"two\nlines\"\n3,plain\n";

        assertThat(read(text, "id", "name")).containsExactly(List.of("1", "Chicken, \"breast\""), List.of("2", "two\nlines"), List.of("3", "plain"));
    }

    @Test
    void windowsLineEndsABomAndBlankLinesAreNotPartOfTheData() throws Exception {
        String text = "﻿\"id\",\"name\"\r\n\"1\",\"a\"\r\n\r\n\"2\",\"b\"\r\n";

        assertThat(read(text, "id", "name")).containsExactly(List.of("1", "a"), List.of("2", "b"));
    }

    @Test
    void aFinalRecordWithoutALineEndIsRead() throws Exception {
        assertThat(read("a,b\n1,2", "a", "b")).containsExactly(List.of("1", "2"));
    }

    @Test
    void anAbsentColumnReadsAsNullAndAShortRecordAsEmpty() throws Exception {
        assertThat(read("a,b,c\n1,2\n", "a", "c", "nope")).containsExactly(java.util.Arrays.asList("1", "", null));
    }

    @Test
    void textTrimsAndTurnsBlankIntoNull() throws Exception {
        Path file = dir.resolve("t.csv");
        Files.writeString(file, "a,b\n\"  x  \",\" \"\n");
        List<String> seen = new ArrayList<>();

        Csv.forEach(file, row -> {
            seen.add(row.text("a"));
            seen.add(row.text("b"));
        });

        assertThat(seen).containsExactly("x", null);
    }

    @Test
    void theHeaderIsTheFirstRecord() throws Exception {
        Path file = dir.resolve("h.csv");
        Files.writeString(file, "\"fdc_id\",\"data_type\"\n\"1\",\"x\"\n");

        assertThat(Csv.header(file)).containsExactly("fdc_id", "data_type");
    }

    @Test
    void aBigFileIsReadRowByRowAndEveryRowArrives() throws Exception {
        Path file = dir.resolve("big.csv");
        try (var out = Files.newBufferedWriter(file)) {
            out.write("id,name\n");
            for (int i = 0; i < 100_000; i++) {
                out.write(i + ",\"row " + i + ", with a comma\"\n");
            }
        }
        long[] count = new long[1];
        String[] last = new String[1];

        Csv.forEach(file, row -> {
            count[0]++;
            last[0] = row.get("name");
        });

        assertThat(count[0]).isEqualTo(100_000);
        assertThat(last[0]).isEqualTo("row 99999, with a comma");
    }

    @Test
    void aFileThatIsNotThereIsAnError() {
        assertThatThrownBy(() -> Csv.forEach(dir.resolve("missing.csv"), row -> {
        })).isInstanceOf(UncheckedIOException.class);
    }
}
