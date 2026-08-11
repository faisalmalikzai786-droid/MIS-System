-- Training classes for students
USE office_mis;

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

INSERT INTO classes (name, description) VALUES
  ('Web Development', 'HTML, CSS, JavaScript and modern web apps'),
  ('Graphic Design', 'Visual design, branding and creative tools'),
  ('E-commerce', 'Online stores, payments and digital selling'),
  ('Data Science', 'Data analysis, visualization and insights'),
  ('ICDL', 'International Computer Driving Licence basics')
ON DUPLICATE KEY UPDATE
  description = VALUES(description);

-- Link students to classes (keep class_name in sync for display)
ALTER TABLE students
  ADD COLUMN class_id INT UNSIGNED NULL AFTER phone;

-- Safe to ignore if FK already exists
ALTER TABLE students
  ADD CONSTRAINT fk_students_class
    FOREIGN KEY (class_id) REFERENCES classes(id)
    ON DELETE SET NULL;
