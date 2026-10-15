-- K-1009 (ADR-077 Ek 7): the move a hold of the load changes, kept with the call as JSON ({exerciseId, before: {loadKg, reps},
-- after: {loadKg, reps}}) taken from the program when the call is applied, as the plan before and after it are (plan_before,
-- plan_after): the record is rebuilt from what the call saw, not from the program as it is later. Null: not a hold of the
-- load, one applied before this was kept, or one that changed no move's target.
alter table decision.weekly_call
    add column held_move jsonb;
