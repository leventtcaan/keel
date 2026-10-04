-- Sessions imported from another app's export (K-615, ADR-053): marked with the app they came from. Listed and charted
-- like any session, never read by the engine (TrainingLog leaves them out). A session logged in the app has none.
alter table training.workout
    add column imported_from text check (imported_from in ('STRONG', 'HEVY'));
