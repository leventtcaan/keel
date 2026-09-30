-- The next session's target for each planned exercise (K-217, K-109 double progression): set after a workout of that
-- day is finished; none until then, and none for a lift the engine does not load-track (isolation, G6 K-33). With it
-- the load it came from (a hold begun later is applied when the program is read) and when that workout started (an
-- older workout finished late does not overwrite a newer target).
alter table training.planned_exercise
    add column next_load_kg numeric(6, 2) check (next_load_kg > 0),
    add column next_reps    int check (next_reps >= 1),
    add column last_load_kg numeric(6, 2) check (last_load_kg > 0),
    add column next_from    timestamp with time zone,
    add check ((next_load_kg is null) = (next_reps is null) and (next_reps is null) = (last_load_kg is null)
        and (last_load_kg is null) = (next_from is null));
