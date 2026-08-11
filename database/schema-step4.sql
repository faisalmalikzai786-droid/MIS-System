-- Step 4: Fees
USE office_mis;

CREATE TABLE IF NOT EXISTS fee_types (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  default_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS fee_payments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id INT UNSIGNED NOT NULL,
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
  CONSTRAINT fk_fee_payments_employee
    FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_fee_payments_type
    FOREIGN KEY (fee_type_id) REFERENCES fee_types(id)
    ON DELETE RESTRICT,
  UNIQUE KEY uq_fee_emp_type_period (employee_id, fee_type_id, month, year)
) ENGINE=InnoDB;

INSERT INTO fee_types (name, description, default_amount)
SELECT * FROM (
  SELECT 'Staff Contribution' AS name, 'Monthly staff contribution fee' AS description, 500.00 AS default_amount
  UNION ALL SELECT 'Uniform Fee', 'Office uniform / dress code fee', 1000.00
  UNION ALL SELECT 'Training Fee', 'Training and workshop fee', 1500.00
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM fee_types LIMIT 1);
