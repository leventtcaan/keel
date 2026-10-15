package app.keel.training;

import app.keel.engine.ParameterSet;
import app.keel.engine.Sex;
import app.keel.profile.ProfileFacts;
import app.keel.profile.Profiles;
import app.keel.shared.AccountId;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The move targets a call is about, for decision to keep when it applies the call (K-1009; decision reads training through
 * this, never the other way). Read-only, from the program as it is today.
 */
@Service
public class TrainingMoveTargets {

    private final ProgramStore programs;
    private final TrainingStatusReader statuses;
    private final TrainingLog log;
    private final Profiles profiles;
    private final ParameterSet parameters;
    private final Clock clock;

    TrainingMoveTargets(ProgramStore programs, TrainingStatusReader statuses, TrainingLog log, Profiles profiles, ParameterSet parameters, Clock clock) {
        this.programs = programs;
        this.statuses = statuses;
        this.log = log;
        this.profiles = profiles;
        this.parameters = parameters;
        this.clock = clock;
    }

    /**
     * The move whose target holding the load changes, the engine's most stalled lift of them ({@link HeldTargets}), as the
     * program stores it and as it shows while the load is held. None without a program, or when the hold changes no target.
     * Called before the hold is in force; decision keeps the answer with the call, since the program keeps today's target only.
     */
    @Transactional(readOnly = true)
    public Optional<HeldMove> heldMove(AccountId account) {
        Optional<ProgramStore.Program> program = programs.current(account);
        if (program.isEmpty()) {
            return Optional.empty();
        }
        Optional<ProfileFacts> facts = profiles.of(account);
        ZoneId zone = facts.map(ProfileFacts::timeZone).orElse(ZoneOffset.UTC);
        LocalDate today = LocalDate.now(clock.withZone(zone));
        Optional<LocalDate> lastSession = log.lastSessionBefore(account, today.atStartOfDay(zone).toInstant()).map(started -> started.atZone(zone).toLocalDate());
        BackAfterBreak back = BackAfterBreak.of(lastSession, today, zone, parameters.forSex(facts.map(profile -> Sex.valueOf(profile.sex().name())).orElse(Sex.MALE)));
        List<ProgramStore.PlannedExercise> planned = program.get().days().stream().flatMap(day -> day.exercises().stream()).toList();
        return HeldTargets.of(planned, statuses.compoundLifts(account, today, zone), back::steppedBack, today);
    }
}
