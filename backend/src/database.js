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

const applied = db.prepare(
  "SELECT name FROM pragma_table_info('overtime_applications') WHERE name = 'overtime_type'"
).get();

if (!applied) {
  db.exec(`
    ALTER TABLE overtime_applications ADD COLUMN overtime_type TEXT NOT NULL DEFAULT 'workday' CHECK(overtime_type IN ('workday', 'weekend', 'holiday'));
    ALTER TABLE overtime_applications ADD COLUMN compensatory_hours REAL NOT NULL DEFAULT 0;
  `);

  const existingRows = db.prepare(
    'SELECT id, duration FROM overtime_applications'
  ).all();

  const updateStmt = db.prepare(
    'UPDATE overtime_applications SET compensatory_hours = duration WHERE id = ?'
  );
  const recalcTransaction = db.transaction(() => {
    for (const row of existingRows) {
      updateStmt.run(row.id);
    }
  });
  recalcTransaction();
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

recalcAllCompensatoryHours();

export default db;
