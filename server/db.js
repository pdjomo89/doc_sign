const path = require('path');
const fs = require('fs');

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_path TEXT NOT NULL,
    file_data TEXT,
    signed_path TEXT,
    signed_data TEXT,
    owner_name TEXT NOT NULL,
    owner_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS signers (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    signature_data TEXT,
    signed_at DATETIME,
    sign_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (document_id) REFERENCES documents(id)
  );
`;

let db;

if (process.env.VERCEL) {
  // Vercel serverless: use sql.js (WASM-based, no native deps)
  const initSqlJs = require('sql.js');
  const DB_PATH = '/tmp/docsign.db';

  let dbInstance = null;
  let initPromise = null;

  function getDb() {
    if (dbInstance) return dbInstance;
    throw new Error('Database not initialized. Call initDb() first.');
  }

  async function initDb() {
    if (dbInstance) return dbInstance;
    if (initPromise) return initPromise;

    initPromise = (async () => {
      const SQL = await initSqlJs();
      try {
        if (fs.existsSync(DB_PATH)) {
          const fileBuffer = fs.readFileSync(DB_PATH);
          dbInstance = new SQL.Database(fileBuffer);
        } else {
          dbInstance = new SQL.Database();
        }
      } catch {
        dbInstance = new SQL.Database();
      }
      dbInstance.run('PRAGMA foreign_keys = ON;');
      dbInstance.run(SCHEMA);
      return dbInstance;
    })();

    return initPromise;
  }

  function saveDb() {
    if (dbInstance) {
      const data = dbInstance.export();
      fs.writeFileSync(DB_PATH, Buffer.from(data));
    }
  }

  // Wrapper that mimics better-sqlite3 API
  db = {
    _isAsync: true,
    initDb,
    prepare: (sql) => ({
      run: (...params) => {
        const d = getDb();
        d.run(sql, params);
        saveDb();
        return { changes: d.getRowsModified() };
      },
      get: (...params) => {
        const d = getDb();
        const stmt = d.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all: (...params) => {
        const d = getDb();
        const results = [];
        const stmt = d.prepare(sql);
        stmt.bind(params);
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      },
    }),
    exec: (sql) => {
      const d = getDb();
      d.run(sql);
      saveDb();
    },
    pragma: () => {},
  };
} else {
  // Local development: use better-sqlite3 (fast, native)
  const Database = require('better-sqlite3');
  db = new Database(path.join(__dirname, 'docsign.db'));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
}

module.exports = db;
