-- K-995 (ADR-073 Ek 7): the change log holds the user's edits of the program (PATCH /v1/program) beside the review's
-- suggestions applied: kind REVIEW with the suggestion as shown, kind EDIT with none. Both have the program before and after
-- them, and an undo reads either back the same way. Every change logged before this is a suggestion.
alter table training.program_review_change
    add column kind text not null default 'REVIEW' check (kind in ('REVIEW', 'EDIT'));
alter table training.program_review_change
    alter column suggestion drop not null;
alter table training.program_review_change
    add constraint program_review_change_suggestion_kind_check check ((kind = 'REVIEW') = (suggestion is not null));
