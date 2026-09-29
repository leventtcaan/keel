package app.keel.engine;

/** The repository's parameter files, for tests outside this package (the specification runner). */
public final class RepositoryParameters {

    private RepositoryParameters() {
    }

    public static Parameters forSex(Sex sex) {
        return EngineFixtures.parameters(sex);
    }

    /** The version hash of the repository's parameter files, as the tests read them from data/parameters. */
    public static String versionHash() {
        return EngineFixtures.PARAMETERS.versionHash();
    }
}
