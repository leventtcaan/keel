-- The next session's target for each planned exercise (K-217, K-109 double progression): set after a workout of that
-- day is finished; none until then, and none for a lift the engine does not load-track (isolation, G6 K-33).
alter table training.planned_exercise
    add column next_load_kg numeric(6, 2) check (next_load_kg > 0),
    add column next_reps    int check (next_reps >= 1),
    add check ((next_load_kg is null) = (next_reps is null));
