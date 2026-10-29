package app.keel.nutrition;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

/**
 * A CSV file read one record at a time (K-1061): FoodData Central's Branded release has a 1.5 GB nutrient file, which no
 * code may hold in memory. RFC 4180: quoted fields, "" inside quotes, commas and line breaks inside quotes; the first
 * record is the header. A row is only valid inside the callback (the parser reuses nothing, but a caller should copy what it
 * keeps, as strings are immutable anyway).
 */
final class Csv {

    /** A record by column name; a column the file does not have reads as null, a short record's missing columns as "". */
    static final class Row {

        private final Map<String, Integer> columns;
        private final List<String> fields;

        private Row(Map<String, Integer> columns, List<String> fields) {
            this.columns = columns;
            this.fields = fields;
        }

        String get(String column) {
            Integer at = columns.get(column);
            if (at == null) {
                return null;
            }
            return at < fields.size() ? fields.get(at) : "";
        }

        /** The column's text trimmed, or null when it is absent or blank. */
        String text(String column) {
            String value = get(column);
            return value == null || value.isBlank() ? null : value.strip();
        }
    }

    private static final int BUFFER = 1 << 16;
    private static final char BYTE_ORDER_MARK = '﻿';

    private Csv() {
    }

    /** The header of the file: its column names, in order. */
    static List<String> header(Path file) {
        List<String> header = new ArrayList<>();
        try (Reader in = open(file)) {
            new Parser(in).next().ifPresent(header::addAll);
        } catch (IOException unreadable) {
            throw new UncheckedIOException("Cannot read " + file, unreadable);
        }
        return header;
    }

    /** Calls {@code each} with every row after the header, in file order; a blank line is no row. */
    static void forEach(Path file, Consumer<Row> each) {
        try (Reader in = open(file)) {
            Parser parser = new Parser(in);
            List<String> header = parser.next().orElse(List.of());
            Map<String, Integer> columns = new HashMap<>();
            for (int i = 0; i < header.size(); i++) {
                columns.putIfAbsent(header.get(i), i);
            }
            for (var record = parser.next(); record.isPresent(); record = parser.next()) {
                each.accept(new Row(columns, record.get()));
            }
        } catch (IOException unreadable) {
            throw new UncheckedIOException("Cannot read " + file, unreadable);
        }
    }

    private static Reader open(Path file) throws IOException {
        InputStream bytes = Files.newInputStream(file);
        return new InputStreamReader(bytes, StandardCharsets.UTF_8);
    }

    /** The records of a stream, one by one. */
    static final class Parser {

        private final Reader in;
        private final char[] buffer = new char[BUFFER];
        private int at;
        private int limit;
        private boolean first = true;

        Parser(Reader in) {
            this.in = in;
        }

        private int read() throws IOException {
            if (at == limit) {
                limit = in.read(buffer, 0, BUFFER);
                at = 0;
                if (limit <= 0) {
                    limit = 0;
                    return -1;
                }
            }
            return buffer[at++];
        }

        private int peek() throws IOException {
            int c = read();
            if (c != -1) {
                at--;
            }
            return c;
        }

        /** The next non-blank record, or empty at the end. */
        java.util.Optional<List<String>> next() throws IOException {
            while (true) {
                List<String> record = new ArrayList<>();
                StringBuilder field = new StringBuilder();
                boolean quoted = false;
                boolean any = false;
                int c;
                while ((c = read()) != -1) {
                    char ch = (char) c;
                    if (first) {
                        first = false;
                        if (ch == BYTE_ORDER_MARK) {
                            continue;
                        }
                    }
                    any = true;
                    if (quoted) {
                        if (ch == '"') {
                            if (peek() == '"') {
                                read();
                                field.append('"');
                            } else {
                                quoted = false;
                            }
                        } else {
                            field.append(ch);
                        }
                    } else if (ch == '"') {
                        quoted = true;
                    } else if (ch == ',') {
                        record.add(field.toString());
                        field.setLength(0);
                    } else if (ch == '\n') {
                        break;
                    } else if (ch != '\r') {
                        field.append(ch);
                    }
                }
                if (!any) {
                    return java.util.Optional.empty();
                }
                record.add(field.toString());
                if (record.size() == 1 && record.getFirst().isEmpty()) {
                    // A blank line (or the end after a final newline's carriage return): no record.
                    if (c == -1) {
                        return java.util.Optional.empty();
                    }
                    continue;
                }
                return java.util.Optional.of(record);
            }
        }
    }
}
