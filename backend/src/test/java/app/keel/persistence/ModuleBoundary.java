package app.keel.persistence;

import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * The module boundary as the database sees it (ADR-023): after the migrations, no foreign key and no view joins two
 * schemas, and public holds only the framework's tables. Reads the PostgreSQL catalog, so no way of writing SQL
 * slips past it.
 */
final class ModuleBoundary {

    private ModuleBoundary() {
    }

    static List<String> crossings(JdbcClient jdbc) {
        List<String> found = new ArrayList<>(jdbc.sql("""
                select 'foreign key ' || src_ns.nspname || '.' || src.relname || ' -> ' || dst_ns.nspname || '.' || dst.relname
                from pg_constraint c
                join pg_class src on src.oid = c.conrelid join pg_namespace src_ns on src_ns.oid = src.relnamespace
                join pg_class dst on dst.oid = c.confrelid join pg_namespace dst_ns on dst_ns.oid = dst.relnamespace
                where c.contype = 'f' and src_ns.nspname <> dst_ns.nspname""").query(String.class).list());
        found.addAll(jdbc.sql("""
                select distinct 'view ' || view_schema || '.' || view_name || ' reads ' || table_schema || '.' || table_name
                from information_schema.view_table_usage
                where view_schema <> table_schema
                  and view_schema not in ('pg_catalog', 'information_schema')""").query(String.class).list());
        return found;
    }

    static List<String> publicTables(JdbcClient jdbc) {
        return jdbc.sql("select table_name from information_schema.tables where table_schema = 'public'")
                .query(String.class).list();
    }
}
