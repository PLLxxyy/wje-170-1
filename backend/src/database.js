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

const SCHEMA_VERSION = 3;
const currentVersion = db.pragma('user_version', { simple: true });

const HOLIDAYS = new Set([
  '2024-01-01', '2024-02-10', '2024-02-11', '2024-02-12', '2024-02-13',
  '2024-02-14', '2024-02-15', '2024-02-16', '2024-02-17',
  '2024-04-04', '2024-04-05', '2024-04-06',
  '2024-05-01', '2024-05-02', '2024-05-03', '2024-05-04', '2024-05-05',
  '2024-06-08', '2024-06-09', '2024-06-10',
  '2024-09-15', '2024-09-16', '2024-09-17',
  '2024-10-01', '2024-10-02', '2024-10-03', '2024-10-04',
  '2024-10-05', '2024-10-06', '2024-10-07',

  '2025-01-01',
  '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31',
  '2025-02-01', '2025-02-02', '2025-02-03', '2025-02-04',
  '2025-04-04', '2025-04-05', '2025-04-06',
  '2025-05-01', '2025-05-02', '2025-05-03', '2025-05-04', '2025-05-05',
  '2025-05-31', '2025-06-01', '2025-06-02',
  '2025-10-01', '2025-10-02', '2025-10-03', '2025-10-04',
  '2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08',

  '2026-01-01', '2026-01-02', '2026-01-03',
  '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19',
  '2026-02-20', '2026-02-21', '2026-02-22',
  '2026-04-04', '2026-04-05', '2026-04-06',
  '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05',
  '2026-06-19', '2026-06-20', '2026-06-21',
  '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04',
  '2026-10-05', '2026-10-06', '2026-10-07',

  '2027-01-01', '2027-01-02', '2027-01-03',
  '2027-02-06', '2027-02-07', '2027-02-08', '2027-02-09',
  '2027-02-10', '2027-02-11', '2027-02-12',
  '2027-04-03', '2027-04-04', '2027-04-05',
  '2027-05-01', '2027-05-02', '2027-05-03',
  '2027-06-09', '2027-06-10', '2027-06-11',
  '2027-10-01', '2027-10-02', '2027-10-03', '2027-10-04',
  '2027-10-05', '2027-10-06', '2027-10-07',
]);

const WORKDAY_MAKEUPS = new Set([
  '2024-02-04', '2024-02-18', '2024-04-07', '2024-04-28', '2024-05-11',
  '2024-09-14', '2024-09-29', '2024-10-12',

  '2025-01-26', '2025-02-08', '2025-04-27', '2025-09-28', '2025-10-11',

  '2026-02-14', '2026-02-28', '2026-09-27', '2026-10-10',

  '2027-02-06', '2027-02-14', '2027-09-26', '2027-10-09',
]);

function getOvertimeTypeByDate(dateStr) {
  if (HOLIDAYS.has(dateStr)) return 'holiday';
  if (WORKDAY_MAKEUPS.has(dateStr)) return 'workday';
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
      if (detected !== row.overtime_type) {
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

if (currentVersion < 3) {
  recalcAllOvertimeTypesByDate();
  recalcAllCompensatoryHours();
  recalcAllLeaveBalances();
  db.pragma('user_version = 3');
}

export { getOvertimeTypeByDate, HOLIDAYS, WORKDAY_MAKEUPS };
export default db;
