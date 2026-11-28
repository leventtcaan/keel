-- The set was logged after "Too heavy?" took the user to a lighter load (K-1262, ADR-096; G1 karar noktası 61): the load before it
-- felt wrong. Read when the next session's target is set: the sets above the marked load are not progressed from, and that
-- session adds no load. False for every set logged before this column or by an older phone.
alter table training.workout_set add column went_lighter boolean not null default false;
