import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbDir = join(__dirname, '..', 'data');
mkdirSync(dbDir, { recursive: true });

const db = new Database(join(dbDir, 'overtime.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('employee', 'supervisor', 'hr')),
    department_id INTEGER NOT NULL,
    supervisor_id INTEGER,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (supervisor_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS overtime_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    duration REAL NOT NULL,
    overtime_type TEXT NOT NULL DEFAULT 'workday' CHECK(overtime_type IN ('workday', 'weekend', 'holiday')),
    compensatory_hours REAL NOT NULL DEFAULT 0,
    reason TEXT NOT NULL,
    work_content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_supervisor' CHECK(status IN ('pending_supervisor', 'pending_hr', 'approved', 'rejected')),
    exchanged INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS leave_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    hours REAL NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_supervisor' CHECK(status IN ('pending_supervisor', 'pending_hr', 'approved', 'rejected')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS approval_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    application_type TEXT NOT NULL CHECK(application_type IN ('overtime', 'leave')),
    approver_id INTEGER NOT NULL,
    level TEXT NOT NULL CHECK(level IN ('supervisor', 'hr')),
    action TEXT NOT NULL CHECK(action IN ('approved', 'rejected')),
    comment TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (approver_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS leave_balances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    total_overtime_hours REAL NOT NULL DEFAULT 0,
    exchanged_hours REAL NOT NULL DEFAULT 0,
    used_hours REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_overtime_user ON overtime_applications(user_id);
  CREATE INDEX IF NOT EXISTS idx_overtime_status ON overtime_applications(status);
  CREATE INDEX IF NOT EXISTS idx_overtime_date ON overtime_applications(date);
  CREATE INDEX IF NOT EXISTS idx_leave_user ON leave_applications(user_id);
  CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_applications(status);
  CREATE INDEX IF NOT EXISTS idx_approval_application ON approval_records(application_id, application_type);
  CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
  CREATE INDEX IF NOT EXISTS idx_users_supervisor ON users(supervisor_id);
`);

const SCHEMA_VERSION = 2;
const currentVersion = db.pragma('user_version', { simple: true });

function getOvertimeTypeByDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  if (day === 0 || day === 6) return 'weekend';
  return 'workday';
}

function recalcAllCompensatoryHours() {
  const rows = db.prepare('SELECT id, duration, overtime_type FROM overtime_applications').all();
  const updateStmt = db.prepare('UPDATE overtime_applications SET compensatory_hours = ? WHERE id = ?');
  const tx = db.transaction(() => {
    for (const row of rows) {
      const multiplier = row.overtime_type === 'weekend' ? 1.5 : row.overtime_type === 'holiday' ? 2 : 1;
      updateStmt.run(Math.round(row.duration * multiplier * 10) / 10, row.id);
    }
  });
  tx();
}

function recalcAllOvertimeTypesByDate() {
  const rows = db.prepare('SELECT id, date, overtime_type FROM overtime_applications').all();
  const updateStmt = db.prepare('UPDATE overtime_applications SET overtime_type = ? WHERE id = ?');
  let changed = 0;
  const tx = db.transaction(() => {
    for (const row of rows) {
      const detected = getOvertimeTypeByDate(row.date);
      if (detected !== row.overtime_type && row.overtime_type === 'workday') {
        updateStmt.run(detected, row.id);
        changed++;
      }
    }
  });
  tx();
  return changed;
}

function recalcAllLeaveBalances() {
  const userBalances = db.prepare(`
    SELECT user_id, COALESCE(SUM(compensatory_hours), 0) as total
    FROM overtime_applications
    WHERE status = 'approved'
    GROUP BY user_id
  `).all();

  const ensureStmt = db.prepare(
    'INSERT OR IGNORE INTO leave_balances (user_id, total_overtime_hours, exchanged_hours, used_hours) VALUES (?, 0, 0, 0)'
  );
  const updateStmt = db.prepare(
    'UPDATE leave_balances SET total_overtime_hours = ? WHERE user_id = ?'
  );

  const tx = db.transaction(() => {
    for (const b of userBalances) {
      ensureStmt.run(b.user_id);
      updateStmt.run(b.total, b.user_id);
    }
  });
  tx();
}

if (currentVersion < 1) {
  const hasTypeCol = db.prepare(
    "SELECT name FROM pragma_table_info('overtime_applications') WHERE name = 'overtime_type'"
  ).get();

  if (!hasTypeCol) {
    db.exec(`
      ALTER TABLE overtime_applications ADD COLUMN overtime_type TEXT NOT NULL DEFAULT 'workday' CHECK(overtime_type IN ('workday', 'weekend', 'holiday'));
      ALTER TABLE overtime_applications ADD COLUMN compensatory_hours REAL NOT NULL DEFAULT 0;
    `);
  }

  recalcAllOvertimeTypesByDate();
  recalcAllCompensatoryHours();
  recalcAllLeaveBalances();

  db.pragma('user_version = 1');
}

if (currentVersion < 2) {
  recalcAllOvertimeTypesByDate();
  recalcAllCompensatoryHours();
  recalcAllLeaveBalances();
  db.pragma('user_version = 2');
}

export default db;
