-- A fixed rep target (K-991, 5 x 5): rep_min = rep_max, the engine adds only load (ADR-073 Ek 4). V8's rep_max > rep_min
-- (a column check on two columns, named planned_exercise_check by PostgreSQL, as V36 notes) becomes a named rep_max >= rep_min.
alter table training.planned_exercise
    drop constraint planned_exercise_check,
    add constraint planned_exercise_rep_range_check check (rep_max >= rep_min);
