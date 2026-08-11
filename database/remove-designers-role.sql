-- Remove the designers role from an existing Course MIS database.
-- Run this in phpMyAdmin or MySQL once.

USE office_mis;

-- Existing designer accounts become teachers
UPDATE users SET role = 'teachers' WHERE role = 'designers';

ALTER TABLE users
  MODIFY role ENUM('admin', 'finance', 'teachers', 'reception', 'students')
  NOT NULL DEFAULT 'reception';
