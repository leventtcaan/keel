-- K-998 (ADR-075 #5: Pause stops the time): how long the session was paused, given at the finish, so the summary's
-- minutes and the Health workout are its active time. 0 for every session before (none was paused) and until a finish.
alter table training.workout add column paused_seconds integer not null default 0 check (paused_seconds >= 0);
