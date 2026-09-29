package app.keel.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

/** Every migration follows {@link MigrationConventions}: named, numbered, and inside its owner's schema. */
class MigrationConventionTests {

    private static final Set<String> OWNERS = Set.of("identity", "profile", "modulith");

    @Test
    void theRepositorysMigrationsFollowTheConventions() throws IOException {
        List<String> files;
        try (Stream<Path> migrations = Files.list(MigrationConventions.DIRECTORY)) {
            files = migrations.map(file -> file.getFileName().toString()).sorted().toList();
        }

        assertThat(files).isNotEmpty();
        assertThat(MigrationConventions.problems(files, MigrationConventionTests::read, MigrationConventions.owners())).isEmpty();
    }

    @Test
    void aModuleMayTouchOnlyItsOwnSchema() {
        Map<String, String> files = Map.of(
                "V1__identity_accounts.sql", "create table identity.account (id uuid primary key);",
                "V2__profile_goals.sql", """
                        create table if not exists profile.goal (account_id uuid references identity.account (id));
                        create index goal_by_account on profile.goal (account_id);""");

        assertThat(MigrationConventions.problems(List.copyOf(files.keySet()).stream().sorted().toList(), files::get, OWNERS))
                .containsExactly("V2__profile_goals.sql: touches identity.account, outside profile.");
    }

    @Test
    void anUnqualifiedTableIsOutsideEveryModule() {
        Map<String, String> files = Map.of("V1__profile_goals.sql", "alter table goal add column x int;");

        assertThat(MigrationConventions.problems(List.of("V1__profile_goals.sql"), files::get, OWNERS))
                .containsExactly("V1__profile_goals.sql: touches goal, outside profile.");
    }

    @Test
    void commentsAreNotStatements() {
        Map<String, String> files = Map.of("V1__profile_goals.sql", """
                -- the goal is set once the account exists (relies on identity.account through the API, not a key)
                create table profile.goal (id uuid primary key); -- see also on profile.goal""");

        assertThat(MigrationConventions.problems(List.of("V1__profile_goals.sql"), files::get, OWNERS)).isEmpty();
    }

    @Test
    void theFrameworkOwnsOnlyPublic() {
        Map<String, String> files = Map.of("V1__modulith_registry.sql", """
                create table if not exists event_publication (id uuid);
                create index if not exists by_date on event_publication (id);
                create table profile.sneaky (id uuid);""");

        assertThat(MigrationConventions.problems(List.of("V1__modulith_registry.sql"), files::get, OWNERS))
                .containsExactly("V1__modulith_registry.sql: touches profile.sneaky, outside public");
    }

    @Test
    void namesAndNumbersAreChecked() {
        Map<String, String> files = Map.of("V1__identity_a.sql", "", "V3__identity_b.sql", "", "V2__nobody_c.sql", "",
                "v4_identity.sql", "");

        assertThat(MigrationConventions.problems(List.of("V1__identity_a.sql", "V2__nobody_c.sql", "V3__identity_b.sql",
                "v4_identity.sql"), files::get, OWNERS)).containsExactly(
                        "V2__nobody_c.sql: owner 'nobody' is not a module",
                        "v4_identity.sql: not V<n>__<owner>_<what>.sql");
    }

    @Test
    void aGapInTheVersionsIsReported() {
        assertThat(MigrationConventions.problems(List.of("V1__identity_a.sql", "V3__identity_b.sql"), file -> "", OWNERS))
                .containsExactly("versions must run 1, 2, 3… without gaps or repeats, got [1, 3]");
    }

    private static String read(String file) {
        try {
            return Files.readString(MigrationConventions.DIRECTORY.resolve(file));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
