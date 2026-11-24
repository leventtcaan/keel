package app.keel.decision;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/** A held-back call as an account without the subscription reads it (contract LockedDecision): its week and the next call's day, nothing it says. */
final class LockedCall {

    private LockedCall() {
    }

    static Map<String, Object> view(UUID id, LocalDate madeOn, LocalDate weekOf, LocalDate nextCallOn) {
        Map<String, Object> view = new LinkedHashMap<>();
        view.put("id", id);
        view.put("madeOn", madeOn);
        view.put("weekOf", weekOf);
        view.put("nextCallOn", nextCallOn);
        view.put("locked", true);
        return view;
    }
}
