-- The leading indicators (K-905, ADR-081): three numbers per sign-up week, worked out from tables the server already
-- keeps. Read-only, one statement, aggregates only: no account id, no health value is selected, and a group smaller than
-- keel.min_cell shows no number, so nothing here names or describes a person. Run by hand by deploy/weekly-report.sh on the
-- VPS (psql, over SSH); the backend's own test (WeeklyReportTests) runs this same file on synthetic rows.
--
-- The definitions (ADR-081 has the reasons):
--   started                an account, grouped by the Monday (UTC) of the week it was made.
--   time to first value    days from the account to its first real weekly call: a call whose action is not
--                          NO_DECISION_YET (U3: "no call yet" is not a call). Median over the accounts that reached it,
--                          with how many did. Accounts that have not reached it are left out, so a young cohort's median is
--                          too low until they do; read it with "reached".
--   week-2 retention       of the accounts at least two weeks old, the share active in their second week. Days are UTC
--                          calendar days: the account's day is day 0, and the second week is day 7 up to (not including) day
--                          14. Active = the person did something themselves that week: started a workout, logged a cardio
--                          session, a weigh-in, a waist, a photo check or a meal, or answered the check-in (the weekly call).
--                          Not counted: what only arrives by itself (Apple Health weigh-ins and cardio, imported workouts)
--                          and signing in. A source that has only a day (cardio, waist, photo check) and one that has a time
--                          are compared the same way, by their UTC day.
--   plan changed, seen     the share of accounts with at least one call that moved their plan and was applied (applied_at).
--                          Calls are made in the person's own check-in and the result is shown there (ADR-077), so an
--                          applied call is one that was shown; the server cannot see a screen.
--
-- Small groups: a group of fewer than keel.min_cell accounts shows only its size. A count or share whose own group is that
-- small (accounts that reached a first call, accounts two weeks old) is empty too, so no row describes one person.
--
-- The report's parameters, in one place (the params query below). Set them before this statement to change them:
--   keel.report_as_of  the moment the report is made for, default now(), e.g. '2026-10-26 12:00+00'
--   keel.week_days     the length of a week, default 7
--   keel.cohort_weeks  how many sign-up weeks back from the report's week are shown, default 8
--   keel.min_cell      the smallest group that shows a number, default 5
with params as (
    select coalesce(nullif(current_setting('keel.report_as_of', true), '')::timestamptz, now()) as as_of,
           coalesce(nullif(current_setting('keel.week_days', true), '')::int, 7)                 as week_days,
           coalesce(nullif(current_setting('keel.cohort_weeks', true), '')::int, 8)              as cohort_weeks,
           coalesce(nullif(current_setting('keel.min_cell', true), '')::int, 5)                  as min_cell
),
-- The one place that says what "active" means: the UTC day on which each account did something itself.
activity (account_id, on_day) as (
    select account_id, (started_at at time zone 'UTC')::date from training.workout where imported_from is null
    union all
    select account_id, day from training.cardio_session where source = 'MANUAL'
    union all
    select account_id, (measured_at at time zone 'UTC')::date from measurement.weigh_in where source = 'MANUAL'
    union all
    select account_id, measured_on from measurement.waist
    union all
    select account_id, taken_on from measurement.photo_check
    union all
    select account_id, (eaten_at at time zone 'UTC')::date from nutrition.meal
    union all
    select account_id, (decided_at at time zone 'UTC')::date from decision.weekly_call
),
started as (
    select a.id,
           a.created_at,
           (a.created_at at time zone 'UTC')::date                                 as created_on,
           date_trunc('week', a.created_at at time zone 'UTC')::date               as cohort,
           p.as_of,
           p.week_days
    from identity.account a
             cross join params p
    where a.created_at <= p.as_of
      and date_trunc('week', a.created_at at time zone 'UTC')::date >=
          (date_trunc('week', p.as_of at time zone 'UTC') - p.cohort_weeks * interval '7 days')::date
),
per_account as (
    select s.cohort,
           s.created_at,
           (select min(c.decided_at)
            from decision.weekly_call c
            where c.account_id = s.id
              and c.decided_at <= s.as_of
              and c.decision -> 'action' ->> 'type' <> 'NO_DECISION_YET') as first_call_at,
           s.created_at + 2 * s.week_days * interval '24 hours' <= s.as_of as settled,
           exists (select 1
                   from activity x
                   where x.account_id = s.id
                     and x.on_day >= s.created_on + s.week_days
                     and x.on_day < s.created_on + 2 * s.week_days)         as active_in_week_2,
           exists (select 1
                   from decision.weekly_call c
                   where c.account_id = s.id
                     and c.applied_at is not null
                     and c.applied_at <= s.as_of)                           as saw_plan_change
    from started s
),
grouped as (
    select cohort,
           count(*)                                                              as started,
           count(first_call_at)                                                  as reached,
           percentile_cont(0.5) within group (order by extract(epoch from first_call_at - created_at) / 86400)
               filter (where first_call_at is not null)                          as median_days,
           count(*) filter (where settled)                                       as eligible,
           count(*) filter (where settled and active_in_week_2)                  as active,
           count(*) filter (where saw_plan_change)                               as seen
    from per_account
    group by grouping sets ((cohort), ())
)
select coalesce(g.cohort::text, 'total (window)')                                               as cohort,
       g.started                                                                                as started,
       case when g.started >= p.min_cell and g.reached >= p.min_cell then g.reached end         as first_call_reached,
       case when g.started >= p.min_cell and g.reached >= p.min_cell then round(g.median_days::numeric, 1) end
                                                                                                as first_call_median_days,
       case when g.started >= p.min_cell and g.eligible >= p.min_cell then g.eligible end       as week_2_eligible,
       case when g.started >= p.min_cell and g.eligible >= p.min_cell then g.active end         as week_2_active,
       case when g.started >= p.min_cell and g.eligible >= p.min_cell then round(100.0 * g.active / g.eligible, 1) end
                                                                                                as week_2_retention_pct,
       case when g.started >= p.min_cell then g.seen end                                        as plan_change_seen,
       case when g.started >= p.min_cell then round(100.0 * g.seen / g.started, 1) end          as plan_change_seen_pct
from grouped g
         cross join params p
order by g.cohort is null, g.cohort desc;
