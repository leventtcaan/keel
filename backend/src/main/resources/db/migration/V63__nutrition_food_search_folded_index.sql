-- The trigram index on the folded search text (V62), built without blocking writes: CONCURRENTLY cannot run in a transaction, so
-- this migration has its own Flyway setting (V63__nutrition_food_search_folded_index.sql.conf). The column is still null when this
-- runs (the backfill follows the start), so the build is quick; the backfill's updates then keep the index.
create index concurrently if not exists food_search_folded_trgm on nutrition.food using gin (search_folded gin_trgm_ops);
