import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = process.env.DB_PATH ?? './data/utxo-pilot.db';
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  applyMigrations(_db);
  return _db;
}

function applyMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL
    );
  `);

  const applied = new Set(
    (db.prepare('SELECT name FROM _migrations').all() as { name: string }[]).map(
      (r) => r.name
    )
  );

  for (const [name, sql] of MIGRATIONS) {
    if (applied.has(name)) continue;
    db.exec(sql);
    db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run(
      name,
      Date.now()
    );
  }
}

// Ordered list of migrations. Append only — never edit existing entries.
const MIGRATIONS: [string, string][] = [
  [
    '001_initial_schema',
    `
    CREATE TABLE wallets (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      name             TEXT NOT NULL,
      original_pub     TEXT NOT NULL,
      pub_type         TEXT NOT NULL CHECK(pub_type IN ('xpub','ypub','zpub','descriptor')),
      script_type      TEXT NOT NULL CHECK(script_type IN ('p2wpkh','p2sh-p2wpkh','p2pkh')),
      derivation_path  TEXT NOT NULL,
      gap_limit        INTEGER NOT NULL DEFAULT 20,
      created_at       INTEGER NOT NULL,
      synced_at        INTEGER
    );

    CREATE TABLE addresses (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_id         INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
      address           TEXT NOT NULL,
      derivation_index  INTEGER NOT NULL,
      is_change         INTEGER NOT NULL DEFAULT 0,
      used              INTEGER NOT NULL DEFAULT 0,
      UNIQUE(wallet_id, is_change, derivation_index),
      UNIQUE(address)
    );

    CREATE TABLE transactions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_id    INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
      txid         TEXT NOT NULL,
      block_height INTEGER,
      block_time   INTEGER,
      fee          INTEGER,
      UNIQUE(wallet_id, txid)
    );

    CREATE TABLE utxos (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_id    INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
      txid         TEXT NOT NULL,
      vout         INTEGER NOT NULL,
      address      TEXT NOT NULL,
      amount       INTEGER NOT NULL,
      block_height INTEGER,
      block_time   INTEGER,
      spent        INTEGER NOT NULL DEFAULT 0,
      spent_txid   TEXT,
      UNIQUE(txid, vout)
    );

    CREATE TABLE labels (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_id   INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
      ref         TEXT NOT NULL,
      label_type  TEXT NOT NULL CHECK(label_type IN ('tx','addr','output')),
      name        TEXT NOT NULL,
      created_at  INTEGER NOT NULL,
      UNIQUE(wallet_id, ref, label_type)
    );

    CREATE TABLE fee_snapshots (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      fetched_at  INTEGER NOT NULL,
      fastest     INTEGER NOT NULL,
      half_hour   INTEGER NOT NULL,
      hour        INTEGER NOT NULL,
      minimum     INTEGER NOT NULL
    );

    CREATE TABLE plans (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_id        INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
      plan_type        TEXT NOT NULL CHECK(plan_type IN ('spend','consolidation')),
      mode             TEXT CHECK(mode IN ('fee-first','privacy-first')),
      target_amount    INTEGER,
      destination      TEXT,
      fee_rate         INTEGER NOT NULL,
      estimated_fee    INTEGER NOT NULL,
      estimated_output INTEGER NOT NULL,
      warnings         TEXT NOT NULL DEFAULT '[]',
      created_at       INTEGER NOT NULL
    );

    CREATE TABLE plan_inputs (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id  INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
      txid     TEXT NOT NULL,
      vout     INTEGER NOT NULL,
      amount   INTEGER NOT NULL
    );

    CREATE TABLE settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO settings (key, value) VALUES
      ('esplora_url', 'https://blockstream.info/api'),
      ('esplora_is_public', 'true'),
      ('dust_threshold', '1000'),
      ('small_utxo_threshold', '10000'),
      ('default_gap_limit', '20');
    `,
  ],
];
