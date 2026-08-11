-- Convert existing Office MIS DB into Course MIS
USE office_mis;

-- Drop office/HR tables that are not needed for a course center
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS leaves;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS fee_payments;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS departments;
SET FOREIGN_KEY_CHECKS = 1;

-- Ensure course tables exist
CREATE TABLE IF NOT EXISTS classes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  teacher_id INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_classes_teacher
    FOREIGN KEY (teacher_id) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS students (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_code VARCHAR(30) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NULL,
  phone VARCHAR(30) NULL,
  class_id INT UNSIGNED NULL,
  class_name VARCHAR(80) NULL,
  enroll_date DATE NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_attendance (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id INT UNSIGNED NOT NULL,
  date DATE NOT NULL,
  status ENUM('present', 'absent', 'late') NOT NULL DEFAULT 'present',
  check_in TIME NULL,
  check_out TIME NULL,
  note VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_attendance_date (student_id, date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fee_types (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  default_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Fees now belong to students (not employees)
CREATE TABLE IF NOT EXISTS fee_payments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id INT UNSIGNED NOT NULL,
  fee_type_id INT UNSIGNED NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  month TINYINT UNSIGNED NOT NULL,
  year SMALLINT UNSIGNED NOT NULL,
  due_date DATE NULL,
  status ENUM('unpaid', 'partial', 'paid') NOT NULL DEFAULT 'unpaid',
  paid_at TIMESTAMP NULL,
  note VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fee_payments_student
    FOREIGN KEY (student_id) REFERENCES students(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_fee_payments_type
    FOREIGN KEY (fee_type_id) REFERENCES fee_types(id)
    ON DELETE RESTRICT,
  UNIQUE KEY uq_fee_student_type_period (student_id, fee_type_id, month, year)
) ENGINE=InnoDB;

-- Map old roles → new course roles, then change ENUM
UPDATE users SET role = 'admin' WHERE role IN ('admin', 'admin');
UPDATE users SET role = 'finance' WHERE role IN ('accountant', 'finance');
UPDATE users SET role = 'reception' WHERE role IN ('hr', 'reception');
UPDATE users SET role = 'teachers' WHERE role IN ('employee', 'teachers', 'designers');
UPDATE users SET role = 'students' WHERE role = 'students';

ALTER TABLE users
  MODIFY role ENUM('admin', 'finance', 'teachers', 'reception', 'students')
  NOT NULL DEFAULT 'reception';

INSERT INTO classes (name, description) VALUES
  ('Web Development', 'HTML, CSS, JavaScript and modern web apps'),
  ('Graphic Design', 'Visual design, branding and creative tools'),
  ('E-commerce', 'Online stores, payments and digital selling'),
  ('Data Science', 'Data analysis, visualization and insights'),
  ('ICDL', 'International Computer Driving Licence basics')
ON DUPLICATE KEY UPDATE description = VALUES(description);
