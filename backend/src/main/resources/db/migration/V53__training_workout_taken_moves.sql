-- #674 (ADR-090 Ek 2): the moves found taken in a session (Taken, in the workout: the equipment was busy), given at the
-- finish, kept beside the answer on form so a later suggestion can read them. Empty for every session before.
alter table training.workout add column taken_exercise_ids text[] not null default '{}';
