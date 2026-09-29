package app.keel.engine;

import java.io.IOException;
import java.io.Reader;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Shared test inputs: the real repository parameters and small builders for weigh-in series. */
final class EngineFixtures {

    static final ParameterSet PARAMETERS = ParameterSet.fromDocuments(ParametersLoaderTests.repositoryDocuments());

    private EngineFixtures() {
    }

    static Parameters parameters(Sex sex) {
        return PARAMETERS.forSex(sex);
    }

    static WeighIn weighIn(LocalDate date, String kg) {
        return new WeighIn(date, new BigDecimal(kg));
    }

    /** One weigh-in every day from {@code first} to {@code last}, all at {@code kg}. */
    static List<WeighIn> daily(LocalDate first, LocalDate last, String kg) {
        List<WeighIn> weighIns = new ArrayList<>();
        for (LocalDate day = first; !day.isAfter(last); day = day.plusDays(1)) {
            weighIns.add(weighIn(day, kg));
        }
        return weighIns;
    }

    static WeightSeries series(List<WeighIn> weighIns) {
        return new WeightSeries(weighIns);
    }

    /** The whole of data/copy/en.json (JSON is valid YAML). */
    static Map<String, Object> copyTree() {
        try (Reader reader = Files.newBufferedReader(Path.of("../data/copy/en.json"))) {
            return ParametersLoaderTests.strictYaml().load(reader);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** The texts behind a copy key in data/copy/en.json; empty if the key is not a text group. */
    @SuppressWarnings("unchecked")
    static Map<String, Object> copyGroup(CopyKey key) {
        Object node = copyTree();
        for (String part : key.value().split("\\.")) {
            node = node instanceof Map<?, ?> map ? map.get(part) : null;
        }
        return node instanceof Map<?, ?> group ? (Map<String, Object>) group : Map.of();
    }
}
