-- ADR-075 #5 (K-961): the sessions still open, for the close that ends them unfinished_session_close_hours after they
-- started (SessionAutoClose, every 15 minutes, across accounts). Few rows are ever open, so the index stays small.
create index workout_open on training.workout (started_at) where ended_at is null;
