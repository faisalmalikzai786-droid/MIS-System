-- Add students + student attendance to an existing office_mis database
USE office_mis;

CREATE TABLE IF NOT EXISTS students (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_code VARCHAR(30) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NULL,
  phone VARCHAR(30) NULL,
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
  UNIQUE KEY uq_student_attendance_date (student_id, date),
  CONSTRAINT fk_student_attendance_student
    FOREIGN KEY (student_id) REFERENCES students(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;
