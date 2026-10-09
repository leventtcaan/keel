/**
 * The phone's record store (K-304, ADR-006): every record the user makes is written here first, with the clientId it
 * will carry to the server (ADR-024). One table is both the local copy and the queue: `state` says whether the server
 * has it yet. The store speaks to a small slice of expo-sqlite's async API (`SqlDatabase`), so tests run it on real SQL
 * (node:sqlite) and the app on expo-sqlite.
 */
export type SqlParam = string | number | null;

/** The part of expo-sqlite's SQLiteDatabase the store uses. */
export interface SqlDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: SqlParam[]): Promise<{ lastInsertRowId: number; changes: number }>;
  getAllAsync<T>(source: string, params: SqlParam[]): Promise<T[]>;
  getFirstAsync<T>(source: string, params: SqlParam[]): Promise<T | null>;
}

/** PENDING: not on the server yet. SYNCED: the server has it. REJECTED: the server refused it for good (kept, not lost). */
export type RecordState = 'PENDING' | 'SYNCED' | 'REJECTED';

export type LocalRecord = {
  seq: number;
  clientId: string;
  kind: string;
  /** The record this one hangs under on the server (a set's workout), by its clientId. */
  parentClientId: string | null;
  body: unknown;
  state: RecordState;
  serverId: string | null;
  /** The server's answer; it replaces the local copy (server wins). */
  serverBody: unknown;
  errorCode: string | null;
};

export type NewLocalRecord = Pick<LocalRecord, 'clientId' | 'kind' | 'parentClientId' | 'body'>;

type Row = {
  seq: number;
  client_id: string;
  kind: string;
  parent_client_id: string | null;
  body: string;
  state: RecordState;
  server_id: string | null;
  server_body: string | null;
  error_code: string | null;
};

// user_version is SQLite's own counter for the schema; each step moves it forward by one and runs once.
const MIGRATIONS = [
  `CREATE TABLE records (
     seq              INTEGER PRIMARY KEY AUTOINCREMENT,
     client_id        TEXT    NOT NULL UNIQUE,
     kind             TEXT    NOT NULL,
     parent_client_id TEXT,
     body             TEXT    NOT NULL,
     state            TEXT    NOT NULL CHECK (state IN ('PENDING', 'SYNCED', 'REJECTED')),
     server_id        TEXT,
     server_body      TEXT,
     error_code       TEXT,
     created_at       TEXT    NOT NULL
   );
   CREATE INDEX records_pending ON records (state, seq);`,
];

const COLUMNS = 'seq, client_id, kind, parent_client_id, body, state, server_id, server_body, error_code';

function toRecord(row: Row): LocalRecord {
  return {
    seq: row.seq,
    clientId: row.client_id,
    kind: row.kind,
    parentClientId: row.parent_client_id,
    body: JSON.parse(row.body),
    state: row.state,
    serverId: row.server_id,
    serverBody: row.server_body === null ? null : JSON.parse(row.server_body),
    errorCode: row.error_code,
  };
}

export type RecordStore = Awaited<ReturnType<typeof openRecordStore>>;

export async function openRecordStore(db: SqlDatabase, now: () => Date = () => new Date()) {
  const version = (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []))?.user_version ?? 0;
  if (version > MIGRATIONS.length) {
    throw new Error(`record store schema ${version} is newer than this app knows (${MIGRATIONS.length})`);
  }
  for (let step = version; step < MIGRATIONS.length; step++) {
    try {
      await db.execAsync(`BEGIN; ${MIGRATIONS[step]} PRAGMA user_version = ${step + 1}; COMMIT;`);
    } catch (error) {
      // execAsync stops at the failing statement and leaves the transaction open; close it so the error that
      // surfaces is this one, not "cannot start a transaction within a transaction" on the next open.
      await db.execAsync('ROLLBACK;').catch(() => undefined);
      throw error;
    }
  }

  const one = async (sql: string, params: SqlParam[]) => {
    const row = await db.getFirstAsync<Row>(sql, params);
    return row === null ? null : toRecord(row);
  };

  return {
    /** False when the clientId is already stored: the first copy stays (the same record made twice is one record). */
    insert: async (record: NewLocalRecord): Promise<boolean> => {
      const { changes } = await db.runAsync(
        `INSERT OR IGNORE INTO records (client_id, kind, parent_client_id, body, state, created_at)
         VALUES (?, ?, ?, ?, 'PENDING', ?)`,
        [record.clientId, record.kind, record.parentClientId, JSON.stringify(record.body), now().toISOString()],
      );
      return changes === 1;
    },

    /** The oldest record the server does not have yet. */
    nextPending: (): Promise<LocalRecord | null> =>
      one(`SELECT ${COLUMNS} FROM records WHERE state = 'PENDING' ORDER BY seq LIMIT 1`, []),

    find: (clientId: string): Promise<LocalRecord | null> =>
      one(`SELECT ${COLUMNS} FROM records WHERE client_id = ?`, [clientId]),

    markSynced: async (clientId: string, serverId: string, serverBody: unknown): Promise<void> => {
      await db.runAsync(
        `UPDATE records SET state = 'SYNCED', server_id = ?, server_body = ?, error_code = NULL WHERE client_id = ?`,
        [serverId, serverBody === undefined ? null : JSON.stringify(serverBody), clientId],
      );
    },

    markRejected: async (clientId: string, errorCode: string): Promise<void> => {
      await db.runAsync(`UPDATE records SET state = 'REJECTED', error_code = ? WHERE client_id = ?`, [errorCode, clientId]);
    },

    rejected: (): Promise<Pick<LocalRecord, 'clientId' | 'kind' | 'errorCode'>[]> =>
      db.getAllAsync<Pick<LocalRecord, 'clientId' | 'kind' | 'errorCode'>>(
        `SELECT client_id AS clientId, kind, error_code AS errorCode FROM records WHERE state = 'REJECTED' ORDER BY seq`,
        [],
      ),

    pendingCount: async (): Promise<number> =>
      (await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM records WHERE state = 'PENDING'`, []))?.n ?? 0,

    all: async (): Promise<LocalRecord[]> =>
      (await db.getAllAsync<Row>(`SELECT ${COLUMNS} FROM records ORDER BY seq`, [])).map(toRecord),

    /**
     * The records of these kinds, in every state — waiting, refused, or the server's copy (K-231: withdrawing the health
     * data consent leaves no health entry on the phone, ADR-030 #25).
     */
    forget: async (kinds: readonly string[]): Promise<void> => {
      if (kinds.length === 0) return;
      await db.runAsync(`DELETE FROM records WHERE kind IN (${kinds.map(() => '?').join(', ')})`, [...kinds]);
    },

    /** One record, whatever its state: the server no longer has it (deleted there), so the phone's copy goes too. */
    forgetClient: async (clientId: string): Promise<void> => {
      await db.runAsync('DELETE FROM records WHERE client_id = ?', [clientId]);
    },

    /**
     * A record the server does not have yet, changed in its place (its order kept): a set corrected in the session
     * (K-972). False, and nothing changed, once it is the server's (sent meanwhile): the caller changes it there.
     */
    replacePending: async (clientId: string, body: unknown): Promise<boolean> => {
      const { changes } = await db.runAsync(`UPDATE records SET body = ? WHERE client_id = ? AND state = 'PENDING'`, [JSON.stringify(body), clientId]);
      return changes === 1;
    },

    /** A record the server does not have yet, taken back (a set deleted in the session, K-972); false once it is the server's. */
    forgetPending: async (clientId: string): Promise<boolean> => {
      const { changes } = await db.runAsync(`DELETE FROM records WHERE client_id = ? AND state = 'PENDING'`, [clientId]);
      return changes === 1;
    },

    /** Everything, for sign-out and account deletion: records on the phone belong to the account that made them. */
    clear: async (): Promise<void> => {
      await db.runAsync('DELETE FROM records', []);
    },
  };
}
