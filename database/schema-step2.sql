-- Step 2 tables only (safe to run on existing office_mis DB)
USE office_mis;

CREATE TABLE IF NOT EXISTS departments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS employees (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  emp_code VARCHAR(30) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NULL,
  phone VARCHAR(30) NULL,
  department_id INT UNSIGNED NULL,
  join_date DATE NULL,
  basic_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_employees_department
    FOREIGN KEY (department_id) REFERENCES departments(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT INTO departments (name, description)
SELECT * FROM (
  SELECT 'Human Resources' AS name, 'People operations and hiring' AS description
  UNION ALL SELECT 'Finance', 'Accounting and fees'
  UNION ALL SELECT 'Operations', 'Daily office operations'
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM departments LIMIT 1);
