-- Every table's exact row count (count(*), not statistics), "schema.table|rows", outside PostgreSQL's own schemas
-- (K-901). backup.sh writes it beside each backup; restore-drill.sh compares a restored copy with it. One dollar-quote
-- tag per level ($f$ outside, $s$ inside): a tag nested in the same tag closes it early. Run with psql -At -v ON_ERROR_STOP=1.
select format($f$select %L || $s$|$s$ || count(*) from %I.%I$f$, schemaname || $s$.$s$ || tablename, schemaname, tablename)
  from pg_tables where schemaname not in ($s$pg_catalog$s$, $s$information_schema$s$) order by 1 \gexec
