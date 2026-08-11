-- Course MIS tables (SQLite):
-- users, classes, students, student_attendance, fee_types, fee_payments

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'reception'
    CHECK (role IN ('admin', 'finance', 'teachers', 'reception', 'students')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT NULL,
  teacher_id INTEGER NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NULL UNIQUE,
  student_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  father_name TEXT NULL,
  email TEXT NULL,
  phone TEXT NULL,
  class_id INTEGER NULL,
  class_name TEXT NULL,
  enroll_date TEXT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS student_attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'present'
    CHECK (status IN ('present', 'absent', 'late')),
  check_in TEXT NULL,
  check_out TEXT NULL,
  note TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (student_id, date),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fee_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT NULL,
  default_amount REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fee_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  fee_type_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  paid_amount REAL NOT NULL DEFAULT 0,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  due_date TEXT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (status IN ('unpaid', 'partial', 'paid')),
  paid_at TEXT NULL,
  note TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (student_id, fee_type_id, month, year),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (fee_type_id) REFERENCES fee_types(id) ON DELETE RESTRICT
);
