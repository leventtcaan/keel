/**
 * The SQL engine for tests: Node's built-in SQLite (node:sqlite, Node ≥ 22.13), behind the same small async surface the
 * app uses from expo-sqlite (`SqlDatabase`). Real SQL — constraints, ordering, UNIQUE — runs in the test, not a mock.
 */
import type { SqlDatabase, SqlParam } from '@/sync/store';

type Statement = { run(...p: SqlParam[]): { lastInsertRowid: number | bigint; changes: number | bigint }; all(...p: SqlParam[]): unknown[]; get(...p: SqlParam[]): unknown };
type DatabaseSync = { exec(sql: string): void; prepare(sql: string): Statement };

export function nodeSqlite(): SqlDatabase {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: new (path: string) => DatabaseSync };
  const db = new DatabaseSync(':memory:');
  return {
    execAsync: async (sql) => db.exec(sql),
    runAsync: async (sql, params = []) => {
      const r = db.prepare(sql).run(...params);
      return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
    },
    getAllAsync: async <T,>(sql: string, params: SqlParam[] = []) => db.prepare(sql).all(...params) as T[],
    getFirstAsync: async <T,>(sql: string, params: SqlParam[] = []) => (db.prepare(sql).get(...params) as T | undefined) ?? null,
  };
}
