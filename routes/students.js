const express = require('express');
const pool = require('../config/db');
const { requireLogin, requireRoles } = require('../middleware/auth');
const { isTeacher } = require('../lib/teacherScope');
const {
  nextStudentCode,
  renumberStudentCodes,
  isStudentCodeTakenError,
} = require('../lib/studentCode');

const router = express.Router();
const canManage = requireRoles('admin', 'reception');
const canView = requireRoles('admin', 'finance', 'teachers', 'reception');

router.use(requireLogin);

async function resolveClass(classId, className) {
  if (classId) {
    const [rows] = await pool.execute(
      'SELECT id, name FROM classes WHERE id = ? LIMIT 1',
      [Number(classId)]
    );
    if (!rows[0]) return null;
    return { id: rows[0].id, name: rows[0].name };
  }

  const name = (className || '').trim();
  if (!name) return { id: null, name: null };

  const [rows] = await pool.execute(
    'SELECT id, name FROM classes WHERE name = ? LIMIT 1',
    [name]
  );
  if (rows[0]) return { id: rows[0].id, name: rows[0].name };
  return { id: null, name };
}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function validateStudentPayload(body) {
  const fullName = (body.full_name || '').trim();
  const fatherName = (body.father_name || '').trim();
  const email = (body.email || '').trim();
  const phone = (body.phone || '').trim();
  const enrollDate = (body.enroll_date || '').trim();
  const classId = body.class_id == null || body.class_id === '' ? null : Number(body.class_id);
  const status = body.status === 'inactive' ? 'inactive' : 'active';

  if (!fullName) {
    return { error: 'Full name is required.' };
  }
  if (fullName.length < 2) {
    return { error: 'Full name must be at least 2 characters.' };
  }
  if (!/^[\p{L}\p{M}][\p{L}\p{M}\s'.-]{1,79}$/u.test(fullName)) {
    return { error: 'Full name can only contain letters, spaces, - and .' };
  }

  if (!fatherName) {
    return { error: 'Father name is required.' };
  }
  if (fatherName.length < 2) {
    return { error: 'Father name must be at least 2 characters.' };
  }
  if (!/^[\p{L}\p{M}][\p{L}\p{M}\s'.-]{1,79}$/u.test(fatherName)) {
    return { error: 'Father name can only contain letters, spaces, - and .' };
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) {
    return { error: 'Enter a valid email address.' };
  }

  if (phone) {
    const digits = phone.replace(/\D/g, '');
    if (!/^\+?[0-9][0-9\s()-]{6,18}$/.test(phone) || digits.length < 7 || digits.length > 15) {
      return { error: 'Enter a valid phone number (7–15 digits).' };
    }
  }

  if (!classId) {
    return { error: 'Please select a class.' };
  }

  if (!enrollDate) {
    return { error: 'Enroll date is required.' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(enrollDate)) {
    return { error: 'Enroll date must be a valid date.' };
  }
  if (enrollDate > todayStr()) {
    return { error: 'Enroll date cannot be in the future.' };
  }

  return {
    value: {
      fullName,
      fatherName,
      email: email || null,
      phone: phone || null,
      enrollDate,
      classId,
      status,
    },
  };
}

async function fetchStudentById(id) {
  const [rows] = await pool.execute(
    `SELECT s.id, s.student_code, s.full_name, s.father_name, s.email, s.phone,
            s.class_id, COALESCE(c.name, s.class_name) AS class_name,
            s.enroll_date, s.status, s.created_at
     FROM students s
     LEFT JOIN classes c ON c.id = s.class_id
     WHERE s.id = ?`,
    [id]
  );
  return rows[0] || null;
}

router.get('/next-code', canManage, async (_req, res) => {
  try {
    const code = await nextStudentCode(pool);
    res.json({ student_code: code });
  } catch (err) {
    console.error('Next student code:', err);
    res.status(500).json({ error: 'Failed to generate student code.' });
  }
});

router.get('/', canView, async (req, res) => {
  const q = (req.query.q || '').trim();
  const classId = req.query.class_id ? Number(req.query.class_id) : null;
  const className = (req.query.class_name || '').trim();
  const status = (req.query.status || '').trim();

  const where = [];
  const params = [];

  if (q) {
    where.push(
      '(s.full_name LIKE ? OR s.father_name LIKE ? OR s.student_code LIKE ? OR s.email LIKE ?)'
    );
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (classId) {
    where.push('s.class_id = ?');
    params.push(classId);
  } else if (className) {
    where.push('COALESCE(c.name, s.class_name) = ?');
    params.push(className);
  }
  if (status === 'active' || status === 'inactive') {
    where.push('s.status = ?');
    params.push(status);
  }
  if (isTeacher(req)) {
    where.push('c.teacher_id = ?');
    params.push(req.session.userId);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  try {
    const [rows] = await pool.execute(
      `SELECT s.id, s.student_code, s.full_name, s.father_name, s.email, s.phone,
              s.class_id, COALESCE(c.name, s.class_name) AS class_name,
              s.enroll_date, s.status, s.created_at
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       ${whereSql}
       ORDER BY s.student_code ASC, s.full_name ASC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('List students:', err);
    res.status(500).json({ error: 'Failed to load students.' });
  }
});

router.post('/', canManage, async (req, res) => {
  const parsed = validateStudentPayload(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  const { fullName, fatherName, email, phone, enrollDate, classId, status } = parsed.value;

  try {
    const cls = await resolveClass(classId, req.body.class_name);
    if (!cls) {
      return res.status(400).json({ error: 'Selected class was not found.' });
    }

    const studentCode = await nextStudentCode(pool);

    const [result] = await pool.execute(
      `INSERT INTO students
        (student_code, full_name, father_name, email, phone, class_id, class_name, enroll_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        studentCode,
        fullName,
        fatherName,
        email,
        phone,
        cls.id,
        cls.name,
        enrollDate,
        status,
      ]
    );

    const created = await fetchStudentById(result.insertId);
    res.status(201).json(created);
  } catch (err) {
    if (isStudentCodeTakenError(err)) {
      return res.status(409).json({
        error: 'Student code conflict. Please try again.',
      });
    }
    console.error('Create student:', err);
    res.status(500).json({ error: 'Failed to create student.' });
  }
});

router.put('/:id', canManage, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Valid student id is required.' });
  }

  const parsed = validateStudentPayload(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  const { fullName, fatherName, email, phone, enrollDate, classId, status } = parsed.value;

  try {
    const cls = await resolveClass(classId, req.body.class_name);
    if (!cls) {
      return res.status(400).json({ error: 'Selected class was not found.' });
    }

    const [result] = await pool.execute(
      `UPDATE students SET
        full_name = ?, father_name = ?, email = ?, phone = ?,
        class_id = ?, class_name = ?, enroll_date = ?, status = ?
       WHERE id = ?`,
      [
        fullName,
        fatherName,
        email,
        phone,
        cls.id,
        cls.name,
        enrollDate,
        status,
        id,
      ]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const updated = await fetchStudentById(id);
    res.json(updated);
  } catch (err) {
    console.error('Update student:', err);
    res.status(500).json({ error: 'Failed to update student.' });
  }
});

router.delete('/:id', canManage, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    return res.status(400).json({ error: 'Invalid student id.' });
  }

  try {
    const [result] = await pool.execute('DELETE FROM students WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const remaining = await renumberStudentCodes(pool);
    res.json({ ok: true, remaining });
  } catch (err) {
    console.error('Delete student:', err);
    res.status(500).json({ error: 'Failed to delete student.' });
  }
});

module.exports = router;
