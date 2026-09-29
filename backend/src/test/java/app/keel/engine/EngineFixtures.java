package app.keel.engine;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

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
}
