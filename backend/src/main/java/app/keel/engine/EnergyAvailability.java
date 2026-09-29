package app.keel.engine;

/**
 * Where a plan's energy availability falls (J1 C6, IOC 2023; thresholds by sex, ADR-020 L-2). Only the band leaves
 * the engine: the number is computed from the internal body-fat estimate and is never shown (U4).
 */
public enum EnergyAvailability {
    /** Under lea_threshold: the safety net narrows the deficit and warns. */
    LOW,
    /** Under ea_warning: no decision changes; the app warns and watches (J1 L2.1). */
    WARNING,
    /** Under ea_adequate: the normal band for losing fat. */
    REDUCED,
    /** At or above ea_adequate. */
    ADEQUATE
}
