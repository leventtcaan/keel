-- Applying a call (K-216, U3): the plan gets a daily step target (G2 K-42; null until a call sets one, the starting
-- target from the parameters applies). Every call keeps when it was applied and undone, and the plan before and after
-- it: the audit trail an undo reads back.
alter table decision.plan
    add column steps_per_day int check (steps_per_day > 0);

alter table decision.weekly_call
    add column applied_at  timestamp with time zone,
    add column undone_at   timestamp with time zone,
    add column plan_before jsonb,
    add column plan_after  jsonb,
    add check ((application in ('APPLIED', 'UNDONE')) = (applied_at is not null and plan_before is not null and plan_after is not null)),
    add check ((application = 'UNDONE') = (undone_at is not null));
