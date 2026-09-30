package app.keel.profile;

import java.time.LocalDate;

/**
 * The adult gate (K-225, ADR-027 #13: set so a launch has no trouble anywhere — one age, no parental consent, no country
 * table). Only the birth year is kept (data minimisation), so on any day of year T someone born in year B is at least
 * T − B − 1: certainly {@code years} old only when T − B ≥ years + 1. Someone who turned 18 this year waits until January.
 */
final class AgeGate {

    private AgeGate() {
    }

    static boolean certainlyAtLeast(int birthYear, LocalDate today, int years) {
        return today.getYear() - birthYear >= years + 1;
    }
}
