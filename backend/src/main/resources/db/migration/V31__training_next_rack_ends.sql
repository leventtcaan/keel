-- K-534 (ADR-045 #73): the next target's reps stopped at the ceiling because the gym has no next load the user can reach.
-- Stored with the target (set and cleared with it), so the program says it; never read back from the reps, which a
-- session held for form can make as high. Targets set before this are not at a ceiling: none was applied.
alter table training.planned_exercise add column next_rack_ends boolean not null default false;
