-- Step 3: Attendance + Leave
USE office_mis;

CREATE TABLE IF NOT EXISTS attendance (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id INT UNSIGNED NOT NULL,
  date DATE NOT NULL,
  status ENUM('present', 'absent', 'late') NOT NULL DEFAULT 'present',
  check_in TIME NULL,
  check_out TIME NULL,
  note VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attendance_employee_date (employee_id, date),
  CONSTRAINT fk_attendance_employee
    FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS leaves (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id INT UNSIGNED NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  reason VARCHAR(500) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  reviewed_by INT UNSIGNED NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_leaves_employee
    FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_leaves_reviewer
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;
