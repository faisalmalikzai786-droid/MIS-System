const express = require('express');
const pool = require('../config/db');
const { requireLogin, requireRoles } = require('../middleware/auth');
const { isTeacher } = require('../lib/teacherScope');

const router = express.Router();
const canView = requireRoles('admin', 'finance', 'teachers', 'reception');
const canManage = requireRoles('admin', 'reception');

router.use(requireLogin);

const classSelect = `
  SELECT c.id, c.name, c.description, c.teacher_id, u.name AS teacher_name,
         c.created_at, COUNT(s.id) AS student_count
  FROM classes c
  LEFT JOIN users u ON u.id = c.teacher_id
  LEFT JOIN students s ON s.class_id = c.id
`;

const classGroupBy = `GROUP BY c.id, c.name, c.description, c.teacher_id, u.name, c.created_at`;

async function fetchClassById(id) {
  const [rows] = await pool.execute(
    `${classSelect}
     WHERE c.id = ?
     ${classGroupBy}`,
    [id]
  );
  return rows[0] || null;
}

router.get('/assignable-teachers', canManage, async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, name, email
       FROM users
       WHERE role = 'teachers'
       ORDER BY name ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('List assignable teachers:', err);
    res.status(500).json({ error: 'Failed to load teachers.' });
  }
});

router.get('/', canView, async (req, res) => {
  try {
    const params = [];
    let where = '';
    if (isTeacher(req)) {
      where = 'WHERE c.teacher_id = ?';
      params.push(req.session.userId);
    }

    const [rows] = await pool.execute(
      `${classSelect}
       ${where}
       ${classGroupBy}
       ORDER BY c.name ASC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('List classes:', err);
    res.status(500).json({ error: 'Failed to load classes.' });
  }
});

router.post('/', canManage, async (req, res) => {
  const name = (req.body.name || '').trim();
  const description = (req.body.description || '').trim() || null;
  const teacherId =
    req.body.teacher_id === '' || req.body.teacher_id == null
      ? null
      : Number(req.body.teacher_id);

  if (!name) {
    return res.status(400).json({ error: 'Class name is required.' });
  }
  if (teacherId !== null && (!Number.isInteger(teacherId) || teacherId < 1)) {
    return res.status(400).json({ error: 'Invalid teacher selected.' });
  }

  try {
    if (teacherId) {
      const [teachers] = await pool.execute(
        `SELECT id FROM users WHERE id = ? AND role = 'teachers' LIMIT 1`,
        [teacherId]
      );
      if (!teachers[0]) {
        return res.status(400).json({ error: 'Selected teacher was not found.' });
      }
    }

    const [result] = await pool.execute(
      'INSERT INTO classes (name, description, teacher_id) VALUES (?, ?, ?)',
      [name, description, teacherId]
    );
    const created = await fetchClassById(result.insertId);
    res.status(201).json(created);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Class name already exists.' });
    }
    console.error('Create class:', err);
    res.status(500).json({ error: 'Failed to create class.' });
  }
});

router.put('/:id', canManage, async (req, res) => {
  const id = Number(req.params.id);
  const name = (req.body.name || '').trim();
  const description = (req.body.description || '').trim() || null;
  const teacherId =
    req.body.teacher_id === '' || req.body.teacher_id == null
      ? null
      : Number(req.body.teacher_id);

  if (!id || !name) {
    return res.status(400).json({ error: 'Valid id and class name are required.' });
  }
  if (teacherId !== null && (!Number.isInteger(teacherId) || teacherId < 1)) {
    return res.status(400).json({ error: 'Invalid teacher selected.' });
  }

  try {
    if (teacherId) {
      const [teachers] = await pool.execute(
        `SELECT id FROM users WHERE id = ? AND role = 'teachers' LIMIT 1`,
        [teacherId]
      );
      if (!teachers[0]) {
        return res.status(400).json({ error: 'Selected teacher was not found.' });
      }
    }

    const [result] = await pool.execute(
      'UPDATE classes SET name = ?, description = ?, teacher_id = ? WHERE id = ?',
      [name, description, teacherId, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Class not found.' });
    }

    await pool.execute('UPDATE students SET class_name = ? WHERE class_id = ?', [name, id]);

    const updated = await fetchClassById(id);
    res.json(updated);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Class name already exists.' });
    }
    console.error('Update class:', err);
    res.status(500).json({ error: 'Failed to update class.' });
  }
});

router.delete('/:id', canManage, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid class id.' });

  try {
    const [result] = await pool.execute('DELETE FROM classes WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Class not found.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete class:', err);
    res.status(500).json({ error: 'Failed to delete class.' });
  }
});

module.exports = router;
