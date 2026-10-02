-- K-432 (ADR-037 #48): the finish's answer on form (G6 K-31) is kept with the workout, so a target derived again after
-- the session is edited holds the moves whose form was not clean, as the finish did.
alter table training.workout add column unclean_exercise_ids text[] not null default '{}';
