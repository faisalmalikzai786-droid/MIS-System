const bcrypt = require('bcryptjs');
const pool = require('../config/db');

/**
 * Ensures default admin + classes exist (safe to run on every boot).
 */
async function ensureSeed() {
  const passwordHash = await bcrypt.hash('Admin@123', 10);

  await pool.execute(
    INSERT INTO users (name, email, password_hash, role)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(email) DO NOTHING,
    ['System Admin', 'admin@course.local', passwordHash, 'admin']
  );

  await pool.execute(
    INSERT INTO users (name, email, password_hash, role)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(email) DO NOTHING,
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
      INSERT INTO classes (name, description)
       VALUES (?, ?)
       ON CONFLICT(name) DO NOTHING,
      [className, description]
    );
  }
}

module.exports = { ensureSeed };
