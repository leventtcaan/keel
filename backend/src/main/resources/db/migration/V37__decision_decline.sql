-- Keep last week's plan (K-963, ADR-077 #3): a call can be DECLINED — kept on record, not applied — and Use this
-- call applies it after all. Declined after it was applied, it keeps when that was and the plans around it (the plan
-- before is put back, as an undo would). The checks of V11 and V12 (named by PostgreSQL) are replaced by named ones.
alter table decision.weekly_call
    add column declined_at timestamp with time zone,
    drop constraint weekly_call_application_check,
    drop constraint weekly_call_check,
    drop constraint weekly_call_check1,
    add constraint weekly_call_application_check
        check (application in ('NOT_NEEDED', 'PENDING', 'APPLIED', 'UNDONE', 'DECLINED')),
    -- When it was applied and the plans around it come together, always for an applied or undone call, never for one
    -- that has not been applied; a declined call has them only if it was applied before.
    add constraint weekly_call_applied_check
        check ((applied_at is null) = (plan_before is null) and (applied_at is null) = (plan_after is null)
            and (application not in ('APPLIED', 'UNDONE') or applied_at is not null)
            and (application not in ('NOT_NEEDED', 'PENDING') or applied_at is null)),
    add constraint weekly_call_undone_check check ((application = 'UNDONE') = (undone_at is not null)),
    add constraint weekly_call_declined_check check ((application = 'DECLINED') = (declined_at is not null));
