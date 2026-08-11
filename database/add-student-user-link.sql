-- Link student login accounts to enrollment records.
USE office_mis;

ALTER TABLE students
  ADD COLUMN user_id INT UNSIGNED NULL UNIQUE AFTER id;

ALTER TABLE students
  ADD CONSTRAINT fk_students_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL;
