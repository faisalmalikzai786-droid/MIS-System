-- Assign one primary teacher per class.
-- Run once in phpMyAdmin / MySQL if the column is not already present.

USE office_mis;

ALTER TABLE classes
  ADD COLUMN teacher_id INT UNSIGNED NULL AFTER description,
  ADD CONSTRAINT fk_classes_teacher
    FOREIGN KEY (teacher_id) REFERENCES users(id)
    ON DELETE SET NULL;
