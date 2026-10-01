-- Notes on a set and on a session (K-422): the user's own words, kept with them. No length check here: the limit is
-- configuration (keel.training.max-note), checked at the API, so it can change without a migration.
alter table training.workout add column note text;
alter table training.workout_set add column note text;
