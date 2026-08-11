/**
 * Seeds the default admin user and course classes.
 * Run after schema: npm run seed
 * Login: admin@course.local / Admin@123
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function seed() {
  const email = 'admin@course.local';
  const password = 'Admin@123';
  const name = 'System Admin';
  const role = 'admin';
  const passwordHash = await bcrypt.hash(password, 10);

  await pool.execute(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET
       name = excluded.name,
       password_hash = excluded.password_hash,
       role = excluded.role`,
    [name, email, passwordHash, role]
  );

  await pool.execute(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET
       name = excluded.name,
       password_hash = excluded.password_hash,
       role = excluded.role`,
    ['System Admin', 'admin@office.local', passwordHash, 'admin']
  );

  const classes = [
    ['Web Development', 'HTML, CSS, JavaScript and modern web apps'],
    ['Graphic Design', 'Visual design, branding and creative tools'],
    ['E-commerce', 'Online stores, payments and digital selling'],
    ['Data Science', 'Data analysis, visualization and insights'],
    ['ICDL', 'International Computer Driving Licence basics'],
  ];

  for (const [className, description] of classes) {
    await pool.execute(
      `INSERT INTO classes (name, description)
       VALUES (?, ?)
       ON CONFLICT(name) DO UPDATE SET description = excluded.description`,
      [className, description]
    );
  }

  console.log('Admin user ready:');
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log('Also: admin@office.local / Admin@123 (admin)');
  console.log('Classes ready: Web Development, Graphic Design, E-commerce, Data Science, ICDL');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  console.error('Make sure the SQLite database path is writable and schema.sql is present.');
  process.exit(1);
});
