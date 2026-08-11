-- Seed admin user
-- Password: Admin@123
-- Prefer running: npm run seed  (generates a fresh bcrypt hash)
-- Or insert manually after generating a hash with bcrypt.

-- Placeholder: run `npm run seed` instead of relying on this static hash.
-- This INSERT is kept for reference; seed.js is the recommended method.
DELETE FROM users WHERE email = 'admin@office.local';

INSERT INTO users (name, email, password_hash, role)
VALUES (
  'System Admin',
  'admin@office.local',
  '$2a$10$9RTBNZSTftWc3cHHmbKxtuan4wcuTmESn7d/BOUMQGV4Qh5ZTAqCy',
  'admin'
);
