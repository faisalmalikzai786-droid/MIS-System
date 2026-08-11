const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { requireLogin, requirePermission } = require('../middleware/auth');
const { ROLES } = require('../lib/roles');

const router = express.Router();
const adminOnly = requirePermission('users.manage');

router.use(requireLogin, adminOnly);

const NEEDS_CLASS = new Set(['teachers', 'students']);

const userSelectSql = `
  SELECT
    u.id,
    u.name,
    u.email,
    u.role,
    u.created_at,
    CASE
      WHEN u.role = 'teachers' THEN (
        SELECT c.id FROM classes c
        WHERE c.teacher_id = u.id
        ORDER BY c.name ASC
        LIMIT 1
      )
      WHEN u.role = 'students' THEN (
        SELECT s.class_id FROM students s
        WHERE s.user_id = u.id
        LIMIT 1
      )
      ELSE NULL
    END AS class_id,
    CASE
      WHEN u.role = 'teachers' THEN (
        SELECT c.name FROM classes c
        WHERE c.teacher_id = u.id
        ORDER BY c.name ASC
        LIMIT 1
      )
      WHEN u.role = 'students' THEN (
        SELECT COALESCE(c.name, s.class_name)
        FROM students s
        LEFT JOIN classes c ON c.id = s.class_id
        WHERE s.user_id = u.id
        LIMIT 1
      )
      ELSE NULL
    END AS class_name
  FROM users u
`;

async function fetchUserById(id) {
  const [rows] = await pool.execute(`${userSelectSql} WHERE u.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function getClassOrThrow(classId) {
  const id = Number(classId);
  if (!id) {
    const err = new Error('Please select a class.');
    err.status = 400;
    throw err;
  }
  const [rows] = await pool.execute(
    'SELECT id, name FROM classes WHERE id = ? LIMIT 1',
    [id]
  );
  if (!rows[0]) {
    const err = new Error('Selected class was not found.');
    err.status = 400;
    throw err;
  }
  return rows[0];
}

async function clearTeacherAssignments(userId) {
  await pool.execute('UPDATE classes SET teacher_id = NULL WHERE teacher_id = ?', [userId]);
}

async function assignTeacherToClass(userId, classId) {
  const cls = await getClassOrThrow(classId);
  await clearTeacherAssignments(userId);
  await pool.execute('UPDATE classes SET teacher_id = ? WHERE id = ?', [userId, cls.id]);
  return cls;
}

const { nextStudentCode } = require('../lib/studentCode');

async function uniqueStudentCode() {
  return nextStudentCode(pool);
}

async function assignStudentToClass(userId, name, email, classId) {
  const cls = await getClassOrThrow(classId);

  const [byUser] = await pool.execute(
    'SELECT id FROM students WHERE user_id = ? LIMIT 1',
    [userId]
  );
  if (byUser[0]) {
    await pool.execute(
      `UPDATE students
       SET full_name = ?, email = ?, class_id = ?, class_name = ?, status = 'active'
       WHERE id = ?`,
      [name, email, cls.id, cls.name, byUser[0].id]
    );
    return cls;
  }

  const [byEmail] = await pool.execute(
    `SELECT id FROM students
     WHERE email = ? AND (user_id IS NULL OR user_id = ?)
     LIMIT 1`,
    [email, userId]
  );
  if (byEmail[0]) {
    await pool.execute(
      `UPDATE students
       SET user_id = ?, full_name = ?, class_id = ?, class_name = ?, status = 'active'
       WHERE id = ?`,
      [userId, name, cls.id, cls.name, byEmail[0].id]
    );
    return cls;
  }

  const studentCode = await uniqueStudentCode();
  const today = new Date().toISOString().slice(0, 10);
  await pool.execute(
    `INSERT INTO students
      (user_id, student_code, full_name, email, class_id, class_name, enroll_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
    [userId, studentCode, name, email, cls.id, cls.name, today]
  );
  return cls;
}

async function unlinkStudentUser(userId) {
  await pool.execute('UPDATE students SET user_id = NULL WHERE user_id = ?', [userId]);
}

async function syncRoleClassAssignments(userId, role, name, email, classId) {
  if (role === 'teachers') {
    await unlinkStudentUser(userId);
    await assignTeacherToClass(userId, classId);
    return;
  }

  if (role === 'students') {
    await clearTeacherAssignments(userId);
    await assignStudentToClass(userId, name, email, classId);
    return;
  }

  await clearTeacherAssignments(userId);
  await unlinkStudentUser(userId);
}

function parseClassId(body, role) {
  if (!NEEDS_CLASS.has(role)) return null;
  const raw = body.class_id;
  if (raw === '' || raw == null) return null;
  return Number(raw);
}

function isEmailTakenError(err) {
  if (err.code === 'ER_DUP_ENTRY') return true;
  const msg = String(err.message || '');
  return /UNIQUE constraint failed:\s*users\.email/i.test(msg);
}

function duplicateEmailResponse(email) {
  return {
    error: `The email "${email}" is already registered. Please use a different email address.`,
  };
}

async function findUserByEmail(email, excludeId = null) {
  if (excludeId) {
    const [rows] = await pool.execute(
      'SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1',
      [email, excludeId]
    );
    return rows[0] || null;
  }
  const [rows] = await pool.execute(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  return rows[0] || null;
}

router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.execute(`${userSelectSql} ORDER BY u.created_at DESC`);
    res.json(rows);
  } catch (err) {
    console.error('List users:', err);
    res.status(500).json({ error: 'Failed to load users.' });
  }
});

router.post('/', async (req, res) => {
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const role = (req.body.role || 'reception').trim();
  const classId = parseClassId(req.body, role);

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }
  if (NEEDS_CLASS.has(role) && !classId) {
    return res.status(400).json({
      error: role === 'teachers'
        ? 'Please assign a class for this teacher.'
        : 'Please assign a class for this student.',
    });
  }

  try {
    if (await findUserByEmail(email)) {
      return res.status(409).json(duplicateEmailResponse(email));
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES (?, ?, ?, ?)`,
      [name, email, passwordHash, role]
    );

    try {
      await syncRoleClassAssignments(result.insertId, role, name, email, classId);
    } catch (assignErr) {
      await pool.execute('DELETE FROM users WHERE id = ?', [result.insertId]);
      throw assignErr;
    }

    const created = await fetchUserById(result.insertId);
    res.status(201).json(created);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    if (isEmailTakenError(err)) {
      return res.status(409).json(duplicateEmailResponse(email));
    }
    console.error('Create user:', err);
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const name = (req.body.name || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const role = (req.body.role || '').trim();
  const password = req.body.password || '';
  const classId = parseClassId(req.body, role);

  if (!id || !name || !email || !ROLES.includes(role)) {
    return res.status(400).json({ error: 'Valid id, name, email, and role are required.' });
  }

  if (id === req.session.userId && role !== 'admin') {
    return res.status(400).json({ error: 'You cannot remove your own admin role.' });
  }

  if (NEEDS_CLASS.has(role) && !classId) {
    return res.status(400).json({
      error: role === 'teachers'
        ? 'Please assign a class for this teacher.'
        : 'Please assign a class for this student.',
    });
  }

  try {
    if (await findUserByEmail(email, id)) {
      return res.status(409).json(duplicateEmailResponse(email));
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const [result] = await pool.execute(
        `UPDATE users SET name = ?, email = ?, role = ?, password_hash = ? WHERE id = ?`,
        [name, email, role, passwordHash, id]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'User not found.' });
      }
    } else {
      const [result] = await pool.execute(
        `UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?`,
        [name, email, role, id]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'User not found.' });
      }
    }

    await syncRoleClassAssignments(id, role, name, email, classId);

    if (id === req.session.userId) {
      req.session.name = name;
      req.session.email = email;
      req.session.role = role;
    }

    const updated = await fetchUserById(id);
    res.json(updated);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    if (isEmailTakenError(err)) {
      return res.status(409).json(duplicateEmailResponse(email));
    }
    console.error('Update user:', err);
    res.status(500).json({ error: 'Failed to update user.' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Invalid user id.' });
  }
  if (id === req.session.userId) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }

  try {
    await clearTeacherAssignments(id);
    await unlinkStudentUser(id);
    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete user:', err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

module.exports = router;
