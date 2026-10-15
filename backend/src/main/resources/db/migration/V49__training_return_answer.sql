-- The answer to the return question (K-1020, ADR-077 #5 and Ek 8): what the user picked on coming back from a gap of
-- return_prompt_days or more without a log. One per account, the newest; gap_from is the user's day of the last log when
-- the answer was given, so the same gap is not asked again and a newer log begins another. It sits in training because
-- PICK_UP changes what the program shows after a break (training cannot read decision, which takes the answer). Training
-- data, not health data: kept with the account, not with the HEALTH_DATA consent.
create table training.return_answer
(
    account_id  uuid primary key,
    choice      text        not null check (choice in ('EASE_BACK', 'PICK_UP', 'REBUILD')),
    gap_from    date        not null,
    answered_at timestamptz not null
);
