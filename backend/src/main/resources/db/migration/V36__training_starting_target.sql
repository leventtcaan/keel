-- A starting weight is a target no session set (K-954, ADR-072 #5): a load and reps without a load it came from nor a
-- session it came from. V14's check (named by PostgreSQL: V8's rep_max > rep_min, on two columns, took
-- planned_exercise_check, so V14's is planned_exercise_check1) wanted all four together; it is replaced by a named one.
-- A load always comes with its reps, the load it came from always with its session, and never without a load.
alter table training.planned_exercise
    drop constraint planned_exercise_check1,
    add constraint planned_exercise_target_check
        check ((next_load_kg is null) = (next_reps is null) and (last_load_kg is null) = (next_from is null)
            and (next_load_kg is not null or last_load_kg is null));
