const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
require('dotenv').config();

const rawPath = process.env.DB_PATH || './data/office_mis.sqlite';
const dbPath = path.isAbsolute(rawPath)
  ? rawPath
  : path.resolve(__dirname, '..', rawPath);

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
db.exec(fs.readFileSync(schemaPath, 'utf8'));

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = columns.some((col) => col.name === column);
  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn('students', 'father_name', 'TEXT NULL');

function toPlainRows(rows) {
  return rows.map((row) => ({ ...row }));
}

function normalizeParam(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

/**
 * mysql2-compatible helper: await pool.execute(sql, params) -> [rows|result]
 */
function execute(sql, params = []) {
  const values = Array.isArray(params) ? params.map(normalizeParam) : [];
  const isQuery = /^\s*(SELECT|WITH)\b/i.test(sql);

  return Promise.resolve().then(() => {
    const stmt = db.prepare(sql);
    if (isQuery) {
      return [toPlainRows(stmt.all(...values))];
    }
    const info = stmt.run(...values);
    return [
      {
        insertId: Number(info.lastInsertRowid),
        affectedRows: info.changes,
      },
    ];
  });
}

module.exports = { execute };
