-- The rest the user took before a set (K-1214), in whole seconds, measured by the phone: from the previous set of the move
-- (or superset round) to the moment the user said Ready. Null for a move's first set, a set after a pause, and every set
-- logged before this column or by an older phone. Read later to adapt the rest band (a rule that needs the owner's approval).
alter table training.workout_set add column rest_seconds integer check (rest_seconds is null or rest_seconds >= 0);
