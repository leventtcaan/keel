-- K-998 (ADR-075 #5: Pause stops the time): how long the session was paused, given at the finish, so the summary's
-- minutes and the Health workout are its active time. 0 for every session before (none was paused) and until a finish.
alter table training.workout add column paused_seconds integer not null default 0 check (paused_seconds >= 0);

-- K-998 (#509 review, ADR-075 #5: a discard leaves nothing): the starting weight given at onboarding (ADR-072 #5) is kept
-- beside the target a session replaces it with, so discarding that session (or deleting all its sets, K-432) brings it
-- back. A load always with its reps. A program made anew has new rows, and no starting weight, as before.
alter table training.planned_exercise
    add column start_load_kg numeric(6, 2) check (start_load_kg > 0),
    add column start_reps integer check (start_reps > 0),
    add constraint planned_exercise_start_check check ((start_load_kg is null) = (start_reps is null));
