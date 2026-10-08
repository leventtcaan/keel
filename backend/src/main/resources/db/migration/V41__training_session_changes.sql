-- K-964 (ADR-073 #5-#6, Ek 2): the user's change to one week's session of a program day — moved to another day of the week
-- (on_date), skipped, the short version, today's swaps (planned move id → the move in its place, as JSON). The program
-- itself never changes here. One row per day and week (its Monday); a day of a program replaced whole leaves none (the
-- rows go with it, ProgramStore#replace). No foreign key to the day: the review rewrites days under the same ids.
create table training.session_change
(
    account_id     uuid    not null,
    program_day_id uuid    not null,
    week_of        date    not null,
    on_date        date check (on_date between week_of and week_of + 6),
    skipped        boolean not null,
    short_version  boolean not null,
    swaps          jsonb   not null,
    primary key (account_id, program_day_id, week_of)
);
