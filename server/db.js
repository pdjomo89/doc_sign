const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'docsign.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_path TEXT NOT NULL,
    signed_path TEXT,
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
`);

module.exports = db;
