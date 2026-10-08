-- K-995 (ADR-073 Ek 5): what undoes a row today's move or skip wrote, as JSON: the program day whose session was moved or
-- skipped (of), the day it was done on (on, the user's today then) and the row's change before it (before). An undo puts
-- each row of that day's change back and clears it; a short version or a swap leaves it as it is. Null: nothing to undo.
alter table training.session_change
    add column undo jsonb;
