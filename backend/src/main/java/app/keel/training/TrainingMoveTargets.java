package app.keel.training;

import app.keel.engine.ParameterSet;
import app.keel.engine.Parameters;
import app.keel.engine.RepRange;
import app.keel.engine.ReturnLoad;
import app.keel.engine.Sex;
import app.keel.profile.ProfileFacts;
import app.keel.profile.Profiles;
import app.keel.shared.AccountId;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The move targets a call is about, for decision's call screen (K-1009; decision reads training through this, never the
 * other way). Read-only, from the program as it is today.
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
     * The move whose target holding the load changes, the most stalled of them ({@link HeldTargets}), as the program stores
     * it and as it shows while the load is held. None without a program, or when the hold changes no target. The program's
     * own number: until a session writes the next target, which is then the held one.
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
        Parameters p = parameters.forSex(facts.map(profile -> Sex.valueOf(profile.sex().name())).orElse(Sex.MALE));
        // Back after a long break the target shown is a step lighter, before any hold (ProgramController.next).
        Optional<LocalDate> lastSession = log.lastSessionBefore(account, today.atStartOfDay(zone).toInstant()).map(started -> started.atZone(zone).toLocalDate());
        boolean afterBreak = lastSession.filter(day -> ReturnLoad.afterBreak(day, today, p)).isPresent();
        Map<String, Integer> stalled = statuses.stalledSessions(account, today, zone);
        List<HeldTargets.Move> moves = program.get().days().stream().flatMap(day -> day.exercises().stream())
                .map(planned -> new HeldTargets.Move(planned.exerciseId(),
                        planned.nextLoadKg() == null ? null : new NextTargets.Target(planned.nextLoadKg(), planned.nextReps(), planned.nextRackEnds()),
                        planned.lastLoadKg(), new RepRange(planned.repMin(), planned.repMax()), stalled.getOrDefault(planned.exerciseId(), 0),
                        afterBreak && planned.nextFrom() != null && planned.nextFrom().atZone(zone).toLocalDate().isBefore(today)))
                .toList();
        return HeldTargets.mostStuck(moves);
    }
}
