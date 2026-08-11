const express = require('express');
const pool = require('../config/db');
const { requireLogin, requireRoles } = require('../middleware/auth');
const {
  isTeacher,
  teacherOwnsStudent,
  teacherOwnsAttendance,
} = require('../lib/teacherScope');

const router = express.Router();
const canManage = requireRoles('admin', 'teachers', 'reception');

router.use(requireLogin);

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function assertTeacherOwnsClass(req, classId) {
  if (!isTeacher(req)) return true;
  const [rows] = await pool.execute(
    'SELECT id FROM classes WHERE id = ? AND teacher_id = ? LIMIT 1',
    [classId, req.session.userId]
  );
  return Boolean(rows[0]);
}

router.get('/', canManage, async (req, res) => {
  const date = (req.query.date || todayStr()).trim();
  const studentId = req.query.student_id ? Number(req.query.student_id) : null;
  const classId = req.query.class_id ? Number(req.query.class_id) : null;

  const where = ['a.date = ?'];
  const params = [date];

  if (studentId) {
    where.push('a.student_id = ?');
    params.push(studentId);
  }
  if (classId) {
    where.push('s.class_id = ?');
    params.push(classId);
  }
  if (isTeacher(req)) {
    where.push('c.teacher_id = ?');
    params.push(req.session.userId);
  }

  try {
    const [rows] = await pool.execute(
      `SELECT a.id, a.student_id, s.student_code, s.full_name,
              s.class_id, COALESCE(c.name, s.class_name) AS class_name,
              a.date, a.status, a.note, a.created_at
       FROM student_attendance a
       JOIN students s ON s.id = a.student_id
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE ${where.join(' AND ')}
       ORDER BY s.full_name ASC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('List student attendance:', err);
    res.status(500).json({ error: 'Failed to load student attendance.' });
  }
});

router.get('/summary', canManage, async (req, res) => {
  const date = (req.query.date || todayStr()).trim();
  const classId = req.query.class_id ? Number(req.query.class_id) : null;

  try {
    const params = [date];
    let joins = `
      INNER JOIN students s ON s.id = a.student_id
      LEFT JOIN classes c ON c.id = s.class_id
    `;
    let extraWhere = '';

    if (classId) {
      extraWhere += ' AND s.class_id = ?';
      params.push(classId);
    }
    if (isTeacher(req)) {
      extraWhere += ' AND c.teacher_id = ?';
      params.push(req.session.userId);
    }

    const [rows] = await pool.execute(
      `SELECT
         SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present_count,
         SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent_count,
         SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) AS late_count,
         COUNT(*) AS total_marked
       FROM student_attendance a
       ${joins}
       WHERE a.date = ?${extraWhere}`,
      params
    );
    res.json({
      date,
      present_count: Number(rows[0].present_count || 0),
      absent_count: Number(rows[0].absent_count || 0),
      late_count: Number(rows[0].late_count || 0),
      total_marked: Number(rows[0].total_marked || 0),
    });
  } catch (err) {
    console.error('Student attendance summary:', err);
    res.status(500).json({ error: 'Failed to load student attendance summary.' });
  }
});

router.post('/bulk', canManage, async (req, res) => {
  const date = (req.body.date || todayStr()).trim();
  const classId = Number(req.body.class_id);
  const presentIds = Array.isArray(req.body.present_ids)
    ? [...new Set(req.body.present_ids.map(Number).filter((id) => id > 0))]
    : [];

  if (!classId || !date) {
    return res.status(400).json({ error: 'Class and date are required.' });
  }

  try {
    if (!(await assertTeacherOwnsClass(req, classId))) {
      return res.status(403).json({
        error: 'You can only mark attendance for your own class.',
      });
    }

    const studentParams = [classId];
    let teacherWhere = '';
    if (isTeacher(req)) {
      teacherWhere = ' AND c.teacher_id = ?';
      studentParams.push(req.session.userId);
    }

    const [students] = await pool.execute(
      `SELECT s.id
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE s.class_id = ? AND s.status = 'active'${teacherWhere}
       ORDER BY s.full_name ASC`,
      studentParams
    );

    if (students.length === 0) {
      return res.status(400).json({ error: 'No active students found in this class.' });
    }

    const presentSet = new Set(presentIds);
    const classStudentIds = new Set(students.map((s) => s.id));
    for (const id of presentIds) {
      if (!classStudentIds.has(id)) {
        return res.status(400).json({
          error: 'One or more selected students are not in this class.',
        });
      }
    }

    for (const student of students) {
      const status = presentSet.has(student.id) ? 'present' : 'absent';
      await pool.execute(
        `INSERT INTO student_attendance (student_id, date, status, check_in, check_out, note)
         VALUES (?, ?, ?, NULL, NULL, NULL)
         ON CONFLICT(student_id, date) DO UPDATE SET
           status = excluded.status,
           check_in = NULL,
           check_out = NULL`,
        [student.id, date, status]
      );
    }

    const [rows] = await pool.execute(
      `SELECT a.id, a.student_id, s.student_code, s.full_name,
              s.class_id, COALESCE(c.name, s.class_name) AS class_name,
              a.date, a.status, a.note, a.created_at
       FROM student_attendance a
       JOIN students s ON s.id = a.student_id
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE a.date = ? AND s.class_id = ?
       ORDER BY s.full_name ASC`,
      [date, classId]
    );

    res.json({
      ok: true,
      date,
      class_id: classId,
      present_count: presentIds.length,
      absent_count: students.length - presentIds.length,
      records: rows,
    });
  } catch (err) {
    console.error('Bulk save student attendance:', err);
    res.status(500).json({ error: 'Failed to save class attendance.' });
  }
});

router.post('/', canManage, async (req, res) => {
  const studentId = Number(req.body.student_id);
  const date = (req.body.date || todayStr()).trim();
  const status = ['present', 'absent', 'late'].includes(req.body.status)
    ? req.body.status
    : 'present';
  const note = (req.body.note || '').trim() || null;

  if (!studentId || !date) {
    return res.status(400).json({ error: 'Student and date are required.' });
  }

  try {
    if (isTeacher(req)) {
      const owns = await teacherOwnsStudent(req.session.userId, studentId);
      if (!owns) {
        return res.status(403).json({
          error: 'You can only mark attendance for students in your class.',
        });
      }
    }

    const [result] = await pool.execute(
      `INSERT INTO student_attendance (student_id, date, status, check_in, check_out, note)
       VALUES (?, ?, ?, NULL, NULL, ?)
       ON CONFLICT(student_id, date) DO UPDATE SET
         status = excluded.status,
         check_in = NULL,
         check_out = NULL,
         note = excluded.note`,
      [studentId, date, status, note]
    );

    const id = result.insertId || null;
    const [rows] = await pool.execute(
      `SELECT a.id, a.student_id, s.student_code, s.full_name,
              s.class_id, COALESCE(c.name, s.class_name) AS class_name,
              a.date, a.status, a.note, a.created_at
       FROM student_attendance a
       JOIN students s ON s.id = a.student_id
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE a.student_id = ? AND a.date = ?
       LIMIT 1`,
      [studentId, date]
    );
    res.status(id ? 201 : 200).json(rows[0]);
  } catch (err) {
    console.error('Save student attendance:', err);
    res.status(500).json({ error: 'Failed to save student attendance.' });
  }
});

router.delete('/:id', canManage, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id.' });

  try {
    if (isTeacher(req)) {
      const owns = await teacherOwnsAttendance(req.session.userId, id);
      if (!owns) {
        return res.status(403).json({
          error: 'You can only delete attendance for students in your class.',
        });
      }
    }

    const [result] = await pool.execute('DELETE FROM student_attendance WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Student attendance record not found.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete student attendance:', err);
    res.status(500).json({ error: 'Failed to delete student attendance.' });
  }
});

module.exports = router;
