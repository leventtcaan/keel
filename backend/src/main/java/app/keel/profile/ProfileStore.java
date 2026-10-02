package app.keel.profile;

import app.keel.shared.AccountId;
import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** The profile table (K-205): one row per account, replaced whole. */
@Repository
class ProfileStore {

    private final JdbcClient jdbc;
    private final Clock clock;

    ProfileStore(JdbcClient jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    Optional<ProfileController.Profile> find(AccountId account) {
        return jdbc.sql("select * from profile.profile where account_id = :account").param("account", account.value())
                .query((row, n) -> read(row)).optional();
    }

    /** When the profile was last saved. */
    Optional<Instant> savedAt(AccountId account) {
        return jdbc.sql("select updated_at from profile.profile where account_id = :account").param("account", account.value())
                .query((row, n) -> row.getObject("updated_at", OffsetDateTime.class).toInstant()).optional();
    }

    void save(AccountId account, ProfileController.Profile profile) {
        ProfileController.Schedule schedule = profile.schedule();
        ProfileController.Food food = profile.food();
        jdbc.sql("""
                insert into profile.profile (account_id, goal, sex, height_cm, birth_year, activity_level, program_choice, units,
                    training_days, usual_training_time, sessions_last_month, check_in_day, time_zone, food_avoid, budget_note, updated_at,
                    training_days_since)
                values (:account, :goal, :sex, :height, :born, :activity, :program, :units, :days, :time, :sessions, :checkIn, :zone,
                    :avoid, :budget, :now, :now)
                on conflict (account_id) do update set goal = excluded.goal, sex = excluded.sex, height_cm = excluded.height_cm,
                    birth_year = excluded.birth_year, activity_level = excluded.activity_level, program_choice = excluded.program_choice,
                    units = excluded.units, training_days = excluded.training_days, usual_training_time = excluded.usual_training_time,
                    sessions_last_month = excluded.sessions_last_month, check_in_day = excluded.check_in_day,
                    time_zone = excluded.time_zone, food_avoid = excluded.food_avoid, budget_note = excluded.budget_note,
                    updated_at = excluded.updated_at, training_days_since = excluded.training_days_since""")
                .param("account", account.value()).param("goal", profile.goal().name()).param("sex", profile.sex().name())
                .param("height", profile.heightCm()).param("born", profile.birthYear())
                .param("activity", profile.activityLevel() == null ? null : profile.activityLevel().name())
                .param("program", profile.programChoice().name()).param("units", profile.units().name())
                .param("days", schedule.trainingDays().stream().map(Enum::name).toArray(String[]::new))
                .param("time", schedule.usualTrainingTime())
                .param("sessions", schedule.sessionsLastMonth() == null ? null : schedule.sessionsLastMonth().name())
                .param("checkIn", schedule.checkInDay().name()).param("zone", schedule.timeZone())
                .param("avoid", food == null || food.avoid() == null ? null : food.avoid().toArray(String[]::new))
                .param("budget", food == null ? null : food.budgetNote())
                .param("now", clock.instant().atOffset(ZoneOffset.UTC)).update();
    }

    private static ProfileController.Profile read(ResultSet row) throws SQLException {
        List<String> avoid = strings(row.getArray("food_avoid"));
        String budget = row.getString("budget_note");
        return new ProfileController.Profile(Goal.valueOf(row.getString("goal")), Sex.valueOf(row.getString("sex")),
                row.getInt("height_cm"), row.getInt("birth_year"), optionalEnum(Activity.class, row.getString("activity_level")),
                ProfileController.ProgramChoice.valueOf(row.getString("program_choice")),
                new ProfileController.Schedule(strings(row.getArray("training_days")).stream().map(DayOfWeek::valueOf).toList(),
                        row.getString("usual_training_time"),
                        optionalEnum(ProfileController.SessionsLastMonth.class, row.getString("sessions_last_month")),
                        DayOfWeek.valueOf(row.getString("check_in_day")), row.getString("time_zone")),
                avoid == null && budget == null ? null : new ProfileController.Food(avoid, budget),
                ProfileController.Units.valueOf(row.getString("units")));
    }

    private static List<String> strings(Array array) throws SQLException {
        return array == null ? null : Arrays.asList((String[]) array.getArray());
    }

    private static <E extends Enum<E>> E optionalEnum(Class<E> type, String name) {
        return name == null ? null : Enum.valueOf(type, name);
    }
}
